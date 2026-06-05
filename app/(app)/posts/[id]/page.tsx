'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PostCard } from '@/components/feed/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from '@/components/user/ReputationBadge'
import { EmptyState } from '@/components/ui/EmptyState'

interface Comment {
  id: string
  content: string
  upvotes: number
  createdAt: string
  author: {
    id: string; name: string; username: string;
    avatarUrl?: string | null; reputationScore: number; isVerified: boolean;
  }
  replies: Comment[]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}س`
  return `${Math.floor(hrs / 24)}ي`
}

function CommentItem({ comment, postId, onReply }: {
  comment: Comment; postId: string;
  onReply: (parentId: string) => void;
}) {
  return (
    <div className="flex gap-3 py-3">
      <Avatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-200 text-sm font-medium">{comment.author.name}</span>
          {comment.author.isVerified && <span className="text-primary-400 text-xs">✓</span>}
          <ReputationBadge score={comment.author.reputationScore} />
          <span className="text-slate-500 text-xs">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-slate-300 text-sm whitespace-pre-wrap">{comment.content}</p>
        <button
          onClick={() => onReply(comment.id)}
          className="text-xs text-slate-500 hover:text-primary-400 mt-1 transition-colors"
        >
          رد
        </button>
        {comment.replies.map((reply) => (
          <div key={reply.id} className="flex gap-2 mt-3 pl-4 border-l-2 border-border">
            <Avatar name={reply.author.name} avatarUrl={reply.author.avatarUrl} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-slate-300 text-xs font-medium">{reply.author.name}</span>
                <span className="text-slate-600 text-xs">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-slate-400 text-xs whitespace-pre-wrap">{reply.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [postRes, commentsRes] = await Promise.all([
        fetch(`/api/posts?id=${id}`),
        fetch(`/api/posts/${id}/comments`),
      ])
      if (commentsRes.ok) {
        const data = await commentsRes.json()
        setComments(data.comments)
      }
      setLoading(false)
    }
    load()
    // Fetch individual post via feed API fallback
    fetch('/api/posts').then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        const found = data.posts.find((p: any) => p.id === id)
        if (found) setPost(found)
      }
    })
  }, [id])

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment.trim(), parentId: replyTo ?? undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo ? { ...c, replies: [...c.replies, { ...data.comment, replies: [] }] } : c
          )
        )
      } else {
        setComments((prev) => [{ ...data.comment, replies: [] }, ...prev])
      }
      setComment('')
      setReplyTo(null)
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">جاري التحميل...</div>
  }

  return (
    <div>
      {post && <PostCard post={post} userVote={post.userVote} />}

      {/* Comment form */}
      <div className="px-4 py-4 border-b border-border">
        <form onSubmit={submitComment}>
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
              <span>رد على تعليق</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-bear-400">✕</button>
            </div>
          )}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="أضف تعليقك..."
            rows={2}
            className="input-field text-sm resize-none mb-2"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!comment.trim() || submitting}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'تعليق'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments */}
      <div className="divide-y divide-border px-4">
        {comments.length === 0 ? (
          <EmptyState icon="💬" title="لا توجد تعليقات بعد" description="كن أول من يعلق" />
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} postId={id} onReply={(pid) => setReplyTo(pid)} />
          ))
        )}
      </div>
    </div>
  )
}
