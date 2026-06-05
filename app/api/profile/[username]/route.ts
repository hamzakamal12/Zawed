export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const session = await getSession()

  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      role: true,
      reputationScore: true,
      predictionAccuracy: true,
      totalPredictions: true,
      correctPredictions: true,
      isVerified: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, posts: true },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let isFollowing = false
  if (session && session.sub !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.sub, followingId: user.id } },
    })
    isFollowing = !!follow
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    take: 20,
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

  return NextResponse.json({ user, posts, isFollowing })
}
