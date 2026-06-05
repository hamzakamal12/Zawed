'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from '@/components/user/ReputationBadge'

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    id: string; name: string; username: string;
    avatarUrl?: string | null; reputationScore: number; isVerified: boolean;
  }
}

function timeStr(date: string) {
  return new Date(date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchMessages() {
    const res = await fetch(`/api/rooms/${id}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/rooms/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages((prev) => [...prev, data.message])
      setInput('')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="text-center text-slate-500 text-sm py-8">جاري التحميل...</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            لا توجد رسائل بعد. كن أول من يبدأ النقاش!
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <Avatar name={msg.author.name} avatarUrl={msg.author.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-slate-200 text-sm font-medium">{msg.author.name}</span>
                {msg.author.isVerified && <span className="text-primary-400 text-xs">✓</span>}
                <ReputationBadge score={msg.author.reputationScore} />
                <span className="text-slate-600 text-xs">{timeStr(msg.createdAt)}</span>
              </div>
              <p className="text-slate-300 text-sm bg-surface-2 rounded-xl px-3 py-2 inline-block max-w-full">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <form onSubmit={send} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="input-field text-sm flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary text-sm px-5 disabled:opacity-50"
          >
            {sending ? '...' : 'إرسال'}
          </button>
        </form>
      </div>
    </div>
  )
}
