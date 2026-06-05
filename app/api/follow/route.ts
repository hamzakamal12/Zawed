export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({ targetUserId: z.string() })

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { targetUserId } = parsed.data
  if (targetUserId === session.sub) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.sub, followingId: targetUserId } },
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true, isFollowing: false })
  }

  await prisma.follow.create({
    data: { followerId: session.sub, followingId: targetUserId },
  })
  return NextResponse.json({ ok: true, isFollowing: true })
}
