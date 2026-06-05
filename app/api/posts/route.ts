export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  type: z.enum(['ANALYSIS', 'NEWS', 'DISCUSSION', 'PREDICTION']).default('DISCUSSION'),
  category: z.enum(['CRYPTO', 'STOCKS', 'REAL_ESTATE', 'FOREX', 'COMMODITIES', 'STARTUPS', 'GENERAL']).default('GENERAL'),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000),
  ticker: z.string().max(20).optional(),
  chartUrl: z.string().url().optional(),
  communityId: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const take = 20

  const session = await getSession()

  let followingIds: string[] = []
  if (session) {
    const follows = await prisma.follow.findMany({
      where: { followerId: session.sub },
      select: { followingId: true },
    })
    followingIds = follows.map((f) => f.followingId)
  }

  const posts = await prisma.post.findMany({
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true, role: true,
        },
      },
      community: { select: { name: true, slug: true } },
    },
  })

  let userVotes: Record<string, number> = {}
  if (session && posts.length > 0) {
    const votes = await prisma.vote.findMany({
      where: { userId: session.sub, postId: { in: posts.map((p) => p.id) } },
    })
    userVotes = Object.fromEntries(votes.map((v) => [v.postId!, v.value]))
  }

  const hasMore = posts.length > take
  const items = hasMore ? posts.slice(0, take) : posts

  return NextResponse.json({
    posts: items.map((p) => ({ ...p, userVote: userVotes[p.id] ?? null })),
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
    followingIds,
  })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const { communityId, ...data } = parsed.data

  if (communityId) {
    const community = await prisma.community.findUnique({ where: { id: communityId } })
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })
  }

  const post = await prisma.post.create({
    data: {
      ...data,
      authorId: session.sub,
      communityId: communityId ?? null,
    },
  })

  if (communityId) {
    await prisma.community.update({
      where: { id: communityId },
      data: { postCount: { increment: 1 } },
    })
  }

  return NextResponse.json({ ok: true, post }, { status: 201 })
}
