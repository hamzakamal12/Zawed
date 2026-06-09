import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { FeedList } from '@/components/feed/FeedList'
import { PostEditor } from '@/components/feed/PostEditor'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const session = await requireSession()

  const [user, follows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, avatarUrl: true },
    }),
    prisma.follow.findMany({
      where: { followerId: session.sub },
      select: { followingId: true },
    }),
  ])

  const followingIds = follows.map((f) => f.followingId)
  const take = 20

  const posts = await prisma.post.findMany({
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    where:
      followingIds.length > 0
        ? { OR: [{ authorId: { in: [...followingIds, session.sub] } }, { upvotes: { gte: 5 } }] }
        : undefined,
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

  const votes = await prisma.vote.findMany({
    where: { userId: session.sub, postId: { in: posts.map((p) => p.id) } },
  })
  const voteMap = Object.fromEntries(votes.map((v) => [v.postId!, v.value]))

  const hasMore = posts.length > take
  const items = hasMore ? posts.slice(0, take) : posts
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

  const feedPosts = items.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: undefined,
    predictionDeadline: p.predictionDeadline?.toISOString() ?? null,
    targetPrice: undefined,
    userVote: voteMap[p.id] ?? null,
  }))

  return (
    <div>
      <PostEditor user={user ?? { name: session.name, avatarUrl: null }} />

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border overflow-x-auto scrollbar-none">
        {[
          { label: 'الكل', href: '/feed' },
          { label: 'عملات رقمية ₿', href: '/communities/crypto' },
          { label: 'أسهم 📈', href: '/communities/stocks' },
          { label: 'عقارات 🏠', href: '/communities/real-estate' },
          { label: 'توقعات 🎯', href: '/explore' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-slate-400 hover:text-slate-100 hover:border-primary-500/40 transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {feedPosts.length === 0 ? (
        <EmptyState
          icon="📊"
          title="لا توجد منشورات بعد"
          description="ابدأ بمتابعة محللين أو انضم لمجتمعات للحصول على تحليلات مخصصة"
          action={
            <Link href="/explore" className="btn-primary text-sm">
              استكشف المجتمعات
            </Link>
          }
        />
      ) : (
        <FeedList
          initialPosts={feedPosts}
          initialCursor={nextCursor}
          currentUserId={session.sub}
        />
      )}
    </div>
  )
}
