export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [trendingPosts, topAnalysts, topCommunities] = await Promise.all([
    prisma.post.findMany({
      take: 15,
      where: { createdAt: { gte: since } },
      orderBy: [{ upvotes: 'desc' }, { commentCount: 'desc' }],
      include: {
        author: {
          select: {
            id: true, name: true, username: true, avatarUrl: true,
            reputationScore: true, isVerified: true, role: true,
          },
        },
        community: { select: { name: true, slug: true } },
      },
    }),
    prisma.user.findMany({
      take: 8,
      orderBy: { reputationScore: 'desc' },
      select: {
        id: true, name: true, username: true, avatarUrl: true,
        bio: true, role: true, reputationScore: true,
        predictionAccuracy: true, totalPredictions: true, isVerified: true,
        _count: { select: { followers: true, posts: true } },
      },
    }),
    prisma.community.findMany({
      take: 8,
      orderBy: { memberCount: 'desc' },
    }),
  ])

  return NextResponse.json({ trendingPosts, topAnalysts, topCommunities })
}
