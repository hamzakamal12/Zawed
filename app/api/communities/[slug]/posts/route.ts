export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const community = await prisma.community.findUnique({ where: { slug: params.slug } })
  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const take = 20

  const session = await getSession()

  const posts = await prisma.post.findMany({
    where: { communityId: community.id },
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
  })
}
