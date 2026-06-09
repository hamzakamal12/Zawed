'use client'

import { useState, useCallback } from 'react'
import { PostCard } from './PostCard'

interface FeedPost {
  id: string
  title?: string | null
  content: string
  imageUrl?: string | null
  chartUrl?: string | null
  ticker?: string | null
  type: string
  category: string
  upvotes: number
  downvotes: number
  commentCount: number
  createdAt: string
  predictionOutcome?: boolean | null
  predictionDeadline?: string | null
  userVote: number | null
  author: {
    id: string
    name: string
    username: string
    avatarUrl?: string | null
    reputationScore: number
    isVerified: boolean
    role: string
  }
  community?: { name: string; slug: string } | null
}

interface FeedListProps {
  initialPosts: FeedPost[]
  initialCursor: string | null
  currentUserId: string
}

export function FeedList({ initialPosts, initialCursor, currentUserId }: FeedListProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts?cursor=${cursor}`)
      if (res.ok) {
        const data = await res.json()
        setPosts((prev) => [...prev, ...data.posts])
        setCursor(data.nextCursor ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [cursor, loading])

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          userVote={post.userVote}
          currentUserId={currentUserId}
          compact
        />
      ))}

      {cursor && (
        <div className="py-6 text-center border-b border-border">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-secondary text-sm px-8 disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
          </button>
        </div>
      )}

      {!cursor && posts.length > 0 && (
        <div className="py-8 text-center text-slate-600 text-sm">
          لا توجد منشورات أخرى
        </div>
      )}
    </div>
  )
}
