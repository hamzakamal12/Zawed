import { prisma } from '@/lib/db'
import { PostCard } from '@/components/feed/PostCard'
import { CommunityCard } from '@/components/community/CommunityCard'
import { AnalystCard } from '@/components/user/AnalystCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const session = await getSession()
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

  let memberIds = new Set<string>()
  if (session) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId: session.sub },
      select: { communityId: true },
    })
    memberIds = new Set(memberships.map((m) => m.communityId))
  }

  let userVotes: Record<string, number> = {}
  if (session && trendingPosts.length > 0) {
    const votes = await prisma.vote.findMany({
      where: { userId: session.sub, postId: { in: trendingPosts.map((p) => p.id) } },
    })
    userVotes = Object.fromEntries(votes.map((v) => [v.postId!, v.value]))
  }

  return (
    <div>
      {/* Top Analysts */}
      <section className="px-4 py-5 border-b border-border">
        <h2 className="text-slate-100 font-bold text-lg mb-4">🏆 أفضل المحللين</h2>
        {topAnalysts.length === 0 ? (
          <EmptyState icon="👤" title="لا يوجد محللون بعد" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topAnalysts.map((u) => (
              <AnalystCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </section>

      {/* Top Communities */}
      <section className="px-4 py-5 border-b border-border">
        <h2 className="text-slate-100 font-bold text-lg mb-4">👥 أكبر المجتمعات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topCommunities.map((c) => (
            <CommunityCard key={c.id} community={c} isMember={memberIds.has(c.id)} />
          ))}
        </div>
      </section>

      {/* Trending Posts */}
      <section>
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-slate-100 font-bold text-lg">🔥 الأكثر تفاعلاً هذا الأسبوع</h2>
        </div>
        {trendingPosts.length === 0 ? (
          <EmptyState icon="📭" title="لا توجد منشورات هذا الأسبوع" />
        ) : (
          trendingPosts.map((post) => (
            <PostCard key={post.id} post={post} userVote={userVotes[post.id]} compact />
          ))
        )}
      </section>
    </div>
  )
}
