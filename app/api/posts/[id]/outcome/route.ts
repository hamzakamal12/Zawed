export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({ outcome: z.boolean() })

// Only the post author or an ADMIN can mark a prediction outcome.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { id: true, type: true, authorId: true, predictionOutcome: true },
  })

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.type !== 'PREDICTION') {
    return NextResponse.json({ error: 'Only PREDICTION posts can have an outcome' }, { status: 400 })
  }
  if (post.predictionOutcome !== null) {
    return NextResponse.json({ error: 'Outcome already set' }, { status: 409 })
  }
  if (post.authorId !== session.sub && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { outcome } = parsed.data

  // Update post outcome and recalculate author reputation atomically
  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: post.id },
      data: { predictionOutcome: outcome },
    })

    const author = await tx.user.findUnique({
      where: { id: post.authorId },
      select: { totalPredictions: true, correctPredictions: true },
    })
    if (!author) return

    const newTotal = author.totalPredictions + 1
    const newCorrect = author.correctPredictions + (outcome ? 1 : 0)
    const accuracy = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0

    // Reputation = weighted blend of accuracy (70%) + activity bonus (30%)
    // Capped at 100. Minimum 0.
    const reputationDelta = outcome ? 2.5 : -1.5
    const newReputation = await tx.user.findUnique({
      where: { id: post.authorId },
      select: { reputationScore: true },
    })
    const updatedScore = Math.max(
      0,
      Math.min(100, (newReputation?.reputationScore ?? 0) + reputationDelta)
    )

    await tx.user.update({
      where: { id: post.authorId },
      data: {
        totalPredictions: newTotal,
        correctPredictions: newCorrect,
        predictionAccuracy: accuracy,
        reputationScore: updatedScore,
      },
    })
  })

  return NextResponse.json({ ok: true, outcome })
}
