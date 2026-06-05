'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface VoteButtonsProps {
  postId: string
  upvotes: number
  downvotes: number
  userVote?: number | null
}

export function VoteButtons({ postId, upvotes, downvotes, userVote }: VoteButtonsProps) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState<{ up: number; down: number; vote: number | null }>({
    up: upvotes,
    down: downvotes,
    vote: userVote ?? null,
  })
  const [loading, setLoading] = useState(false)

  async function vote(value: 1 | -1) {
    if (loading) return
    setLoading(true)

    const prev = { ...optimistic }
    const newVote = optimistic.vote === value ? null : value

    // Optimistic update
    let newUp = upvotes
    let newDown = downvotes
    if (prev.vote === 1) newUp--
    if (prev.vote === -1) newDown--
    if (newVote === 1) newUp++
    if (newVote === -1) newDown++
    setOptimistic({ up: newUp, down: newDown, vote: newVote })

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) {
        setOptimistic(prev)
      } else {
        router.refresh()
      }
    } catch {
      setOptimistic(prev)
    } finally {
      setLoading(false)
    }
  }

  const score = optimistic.up - optimistic.down

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => vote(1)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors
          ${optimistic.vote === 1
            ? 'text-bull-400 bg-bull-500/15'
            : 'text-slate-400 hover:text-bull-400 hover:bg-bull-500/10'
          }`}
      >
        <span>▲</span>
        <span>{optimistic.up}</span>
      </button>

      <span
        className={`text-sm font-bold px-1 ${
          score > 0 ? 'text-bull-400' : score < 0 ? 'text-bear-400' : 'text-slate-500'
        }`}
      >
        {score > 0 ? '+' : ''}{score}
      </span>

      <button
        onClick={() => vote(-1)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors
          ${optimistic.vote === -1
            ? 'text-bear-400 bg-bear-500/15'
            : 'text-slate-400 hover:text-bear-400 hover:bg-bear-500/10'
          }`}
      >
        <span>▼</span>
        <span>{optimistic.down}</span>
      </button>
    </div>
  )
}
