'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from '@/components/user/ReputationBadge'
import { Ticker } from '@/components/ui/Ticker'
import { VoteButtons } from './VoteButtons'

interface PostCardProps {
  post: {
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
    createdAt: Date | string
    predictionOutcome?: boolean | null
    predictionDeadline?: Date | string | null
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
  userVote?: number | null
  compact?: boolean
  currentUserId?: string
}

const typeLabel: Record<string, { label: string; color: string }> = {
  ANALYSIS: { label: 'تحليل', color: 'text-blue-400 bg-blue-500/10' },
  PREDICTION: { label: 'توقع', color: 'text-primary-400 bg-primary-500/10' },
  NEWS: { label: 'خبر', color: 'text-purple-400 bg-purple-500/10' },
  DISCUSSION: { label: 'نقاش', color: 'text-slate-300 bg-slate-700/40' },
}

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}س`
  return `${Math.floor(hrs / 24)}ي`
}

function OutcomeButtons({ postId }: { postId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function markOutcome(outcome: boolean) {
    if (loading) return
    setLoading(true)
    await fetch(`/api/posts/${postId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-slate-500 text-xs">تحديد النتيجة:</span>
      <button
        onClick={() => markOutcome(true)}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded-md bg-bull-500/15 text-bull-400 hover:bg-bull-500/25 transition-colors disabled:opacity-50"
      >
        ✓ صحيح
      </button>
      <button
        onClick={() => markOutcome(false)}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded-md bg-bear-500/15 text-bear-400 hover:bg-bear-500/25 transition-colors disabled:opacity-50"
      >
        ✗ خطأ
      </button>
    </div>
  )
}

export function PostCard({ post, userVote, compact = false, currentUserId }: PostCardProps) {
  const type = typeLabel[post.type] ?? typeLabel.DISCUSSION
  const isOwner = currentUserId === post.author.id
  const isPendingPrediction =
    post.type === 'PREDICTION' && post.predictionOutcome === null

  return (
    <article className="border-b border-border hover:bg-surface/40 transition-colors">
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar name={post.author.name} avatarUrl={post.author.avatarUrl} size="md" />
          </Link>

          <div className="flex-1 min-w-0">
            {/* Author row */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
              <Link
                href={`/profile/${post.author.username}`}
                className="text-slate-100 font-semibold text-sm hover:text-primary-400 transition-colors"
              >
                {post.author.name}
              </Link>
              {post.author.isVerified && (
                <span className="text-primary-400 text-xs" title="محلل موثق">✓</span>
              )}
              <ReputationBadge score={post.author.reputationScore} />
              <span className="text-slate-500 text-xs">@{post.author.username}</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-500 text-xs">{timeAgo(post.createdAt)}</span>

              {post.community && (
                <>
                  <span className="text-slate-600 text-xs">في</span>
                  <Link
                    href={`/communities/${post.community.slug}`}
                    className="text-primary-400 text-xs hover:text-primary-300"
                  >
                    {post.community.name}
                  </Link>
                </>
              )}
            </div>

            {/* Type + ticker + outcome badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${type.color}`}>
                {type.label}
              </span>
              {post.ticker && <Ticker symbol={post.ticker} />}
              {post.type === 'PREDICTION' && post.predictionOutcome !== null && post.predictionOutcome !== undefined && (
                <span className={post.predictionOutcome ? 'badge-bull' : 'badge-bear'}>
                  {post.predictionOutcome ? '✓ صحيح' : '✗ خطأ'}
                </span>
              )}
              {isPendingPrediction && (
                <span className="text-xs text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded">
                  ⏳ قيد الانتظار
                </span>
              )}
            </div>

            {/* Title */}
            {post.title && (
              <Link href={`/posts/${post.id}`}>
                <h2 className="text-slate-100 font-semibold text-base mb-1 hover:text-primary-300 transition-colors">
                  {post.title}
                </h2>
              </Link>
            )}

            {/* Content */}
            <p
              className={`text-slate-300 text-sm leading-relaxed ${
                compact ? 'line-clamp-3' : 'whitespace-pre-wrap'
              }`}
            >
              {post.content}
            </p>

            {/* Chart */}
            {post.chartUrl && !compact && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.chartUrl}
                  alt="Chart"
                  className="w-full max-h-80 object-contain bg-surface-2"
                />
              </div>
            )}

            {/* Owner: mark prediction outcome */}
            {isOwner && isPendingPrediction && !compact && (
              <OutcomeButtons postId={post.id} />
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3">
              <VoteButtons
                postId={post.id}
                upvotes={post.upvotes}
                downvotes={post.downvotes}
                userVote={userVote}
              />

              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 text-sm transition-colors"
              >
                <span>💬</span>
                <span>{post.commentCount}</span>
              </Link>

              <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                <span>↗</span>
                <span className="sr-only">مشاركة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
