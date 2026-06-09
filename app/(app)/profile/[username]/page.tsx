'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from '@/components/user/ReputationBadge'
import { PostCard } from '@/components/feed/PostCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AssetCategory, PostType } from '@prisma/client'

interface ProfileUser {
  id: string; name: string; username: string; bio?: string | null
  avatarUrl?: string | null; role: string; reputationScore: number
  predictionAccuracy: number; totalPredictions: number
  correctPredictions: number; isVerified: boolean; createdAt: string
  _count: { followers: number; following: number; posts: number }
}

interface ProfilePost {
  id: string; title?: string | null; content: string
  imageUrl?: string | null; chartUrl?: string | null; ticker?: string | null
  type: PostType; category: AssetCategory; upvotes: number; downvotes: number
  commentCount: number; createdAt: string; predictionOutcome?: boolean | null
  predictionDeadline?: string | null; userVote: number | null
  author: {
    id: string; name: string; username: string; avatarUrl?: string | null
    reputationScore: number; isVerified: boolean; role: string
  }
  community?: { name: string; slug: string } | null
}

const roleLabel: Record<string, string> = {
  VERIFIED_ANALYST: 'محلل موثق',
  ANALYST: 'محلل',
  USER: 'عضو',
  ADMIN: 'مشرف',
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<{
    user: ProfileUser
    posts: ProfilePost[]
    isFollowing: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/profile/${username}`).then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setProfile(data)
        setFollowing(data.isFollowing)
      }
      setLoading(false)
    })
  }, [username])

  async function toggleFollow() {
    if (!profile || followLoading) return
    setFollowLoading(true)
    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: profile.user.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setFollowing(data.isFollowing)
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                _count: {
                  ...prev.user._count,
                  followers: prev.user._count.followers + (data.isFollowing ? 1 : -1),
                },
              },
            }
          : prev
      )
    }
    setFollowLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">جاري التحميل...</div>
  }

  if (!profile) {
    return <EmptyState icon="👤" title="المستخدم غير موجود" />
  }

  const { user, posts } = profile

  return (
    <div>
      {/* Profile header */}
      <div className="px-4 py-6 border-b border-border">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-slate-100 font-bold text-xl">{user.name}</h1>
                  {user.isVerified && (
                    <span className="text-primary-400 font-bold" title="محلل موثق">✓</span>
                  )}
                  <ReputationBadge score={user.reputationScore} showLabel size="md" />
                </div>
                <div className="text-slate-500 text-sm mt-0.5">
                  @{user.username} · {roleLabel[user.role] ?? 'عضو'}
                </div>
                {user.bio && <p className="text-slate-300 text-sm mt-2">{user.bio}</p>}
              </div>
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={following ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
              >
                {followLoading ? '...' : following ? 'إلغاء المتابعة' : 'متابعة'}
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 mt-4 flex-wrap text-sm">
              <div className="text-center">
                <div className="text-slate-100 font-bold">{user._count.posts.toLocaleString()}</div>
                <div className="text-slate-500 text-xs">منشور</div>
              </div>
              <div className="text-center">
                <div className="text-slate-100 font-bold">{user._count.followers.toLocaleString()}</div>
                <div className="text-slate-500 text-xs">متابع</div>
              </div>
              <div className="text-center">
                <div className="text-slate-100 font-bold">{user._count.following.toLocaleString()}</div>
                <div className="text-slate-500 text-xs">يتابع</div>
              </div>
              {user.totalPredictions > 0 && (
                <div className="text-center">
                  <div className="text-bull-400 font-bold">{user.predictionAccuracy.toFixed(0)}%</div>
                  <div className="text-slate-500 text-xs">دقة التوقعات</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-slate-300 font-semibold text-sm">المنشورات ({user._count.posts})</h2>
      </div>
      {posts.length === 0 ? (
        <EmptyState icon="📝" title="لا توجد منشورات بعد" />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} compact />)
      )}
    </div>
  )
}
