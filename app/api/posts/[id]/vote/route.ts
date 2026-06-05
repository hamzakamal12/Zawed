export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid value' }, { status: 400 })

  const { value } = parsed.data
  const postId = params.id

  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const existing = await prisma.vote.findUnique({
    where: { userId_postId: { userId: session.sub, postId } },
  })

  if (existing) {
    if (existing.value === value) {
      // Toggle off
      await prisma.vote.delete({ where: { id: existing.id } })
      await prisma.post.update({
        where: { id: postId },
        data: {
          upvotes: value === 1 ? { decrement: 1 } : undefined,
          downvotes: value === -1 ? { decrement: 1 } : undefined,
        },
      })
      return NextResponse.json({ ok: true, vote: null })
    } else {
      // Change vote
      await prisma.vote.update({ where: { id: existing.id }, data: { value } })
      await prisma.post.update({
        where: { id: postId },
        data: {
          upvotes: value === 1 ? { increment: 1 } : { decrement: 1 },
          downvotes: value === -1 ? { increment: 1 } : { decrement: 1 },
        },
      })
      return NextResponse.json({ ok: true, vote: value })
    }
  }

  await prisma.vote.create({ data: { userId: session.sub, postId, value } })
  await prisma.post.update({
    where: { id: postId },
    data: {
      upvotes: value === 1 ? { increment: 1 } : undefined,
      downvotes: value === -1 ? { increment: 1 } : undefined,
    },
  })

  return NextResponse.json({ ok: true, vote: value })
}
