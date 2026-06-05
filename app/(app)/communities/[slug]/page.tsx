'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PostCard } from '@/components/feed/PostCard'
import { EmptyState } from '@/components/ui/EmptyState'

const categoryEmoji: Record<string, string> = {
  CRYPTO: '₿', STOCKS: '📈', REAL_ESTATE: '🏠',
  FOREX: '💱', COMMODITIES: '🥇', STARTUPS: '🚀', GENERAL: '💡',
}

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>()
  const [community, setCommunity] = useState<{
    id: string; name: string; slug: string; description?: string | null;
    category: string; memberCount: number; postCount: number;
  } | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [communityRes, postsRes] = await Promise.all([
        fetch(`/api/communities/${slug}`),
        fetch(`/api/communities/${slug}/posts`),
      ])
      if (communityRes.ok) {
        const data = await communityRes.json()
        setCommunity(data.community)
        setIsMember(data.isMember)
      }
      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.posts)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  async function toggleJoin() {
    if (!community || joining) return
    setJoining(true)
    const res = await fetch(`/api/communities/${slug}/join`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setIsMember(data.isMember)
      setCommunity((prev) =>
        prev ? { ...prev, memberCount: prev.memberCount + (data.isMember ? 1 : -1) } : prev
      )
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-400 text-sm">جاري التحميل...</div>
      </div>
    )
  }

  if (!community) {
    return <EmptyState icon="❌" title="المجتمع غير موجود" />
  }

  const emoji = categoryEmoji[community.category] ?? '💡'

  return (
    <div>
      {/* Community header */}
      <div className="border-b border-border px-4 py-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center text-3xl flex-shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-slate-100 font-bold text-xl">{community.name}</h1>
                {community.description && (
                  <p className="text-slate-400 text-sm mt-1">{community.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>👥 {community.memberCount.toLocaleString()} عضو</span>
                  <span>📝 {community.postCount.toLocaleString()} منشور</span>
                </div>
              </div>
              <button
                onClick={toggleJoin}
                disabled={joining}
                className={isMember ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
              >
                {joining ? '...' : isMember ? 'إلغاء الانضمام' : 'انضم'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <EmptyState
          icon="📝"
          title="لا توجد منشورات بعد"
          description="كن أول من ينشر في هذا المجتمع"
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} compact />)
      )}
    </div>
  )
}
