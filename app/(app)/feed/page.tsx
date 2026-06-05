import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/feed/PostCard'
import { PostEditor } from '@/components/feed/PostEditor'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const session = await requireSession()

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, avatarUrl: true, reputationScore: true },
  })

  // Get followed users
  const follows = await prisma.follow.findMany({
    where: { followerId: session.sub },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  // Get posts: from followed + own + recent trending
  const posts = await prisma.post.findMany({
    take: 30,
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

  // Get user votes for these posts
  const votes = await prisma.vote.findMany({
    where: { userId: session.sub, postId: { in: posts.map((p) => p.id) } },
  })
  const voteMap = Object.fromEntries(votes.map((v) => [v.postId!, v.value]))

  return (
    <div>
      {/* Post editor */}
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

      {/* Posts */}
      {posts.length === 0 ? (
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
        posts.map((post) => (
          <PostCard key={post.id} post={post} userVote={voteMap[post.id]} compact />
        ))
      )}
    </div>
  )
}
