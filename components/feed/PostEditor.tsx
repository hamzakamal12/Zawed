'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'

interface PostEditorProps {
  user: { name: string; avatarUrl?: string | null }
  communityId?: string
  onSuccess?: () => void
}

const POST_TYPES = [
  { value: 'DISCUSSION', label: 'نقاش', icon: '💬' },
  { value: 'ANALYSIS', label: 'تحليل', icon: '📊' },
  { value: 'PREDICTION', label: 'توقع', icon: '🎯' },
  { value: 'NEWS', label: 'خبر', icon: '📰' },
]

const CATEGORIES = [
  { value: 'GENERAL', label: 'عام' },
  { value: 'CRYPTO', label: 'عملات رقمية' },
  { value: 'STOCKS', label: 'أسهم' },
  { value: 'REAL_ESTATE', label: 'عقارات' },
  { value: 'FOREX', label: 'فوركس' },
  { value: 'COMMODITIES', label: 'سلع' },
  { value: 'STARTUPS', label: 'مشاريع ناشئة' },
]

export function PostEditor({ user, communityId, onSuccess }: PostEditorProps) {
  const router = useRouter()
  const [type, setType] = useState('DISCUSSION')
  const [category, setCategory] = useState('GENERAL')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [ticker, setTicker] = useState('')
  const [chartUrl, setChartUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          title: title.trim() || undefined,
          content: content.trim(),
          ticker: ticker.trim().toUpperCase() || undefined,
          chartUrl: chartUrl.trim() || undefined,
          communityId: communityId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'حدث خطأ، حاول مرة أخرى')
      } else {
        setContent('')
        setTitle('')
        setTicker('')
        setChartUrl('')
        onSuccess?.()
        router.refresh()
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-b border-border px-4 py-4">
      <div className="flex gap-3">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
        <div className="flex-1 min-w-0">
          {/* Type selector */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors
                  ${type === t.value
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-2 border border-transparent'
                  }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Title (optional) */}
          <input
            type="text"
            placeholder="العنوان (اختياري)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mb-2 text-sm"
          />

          {/* Content */}
          <textarea
            placeholder="شارك تحليلك أو توقعك..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            className="input-field mb-2 text-sm resize-none"
          />

          {/* Extra fields */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <input
              type="text"
              placeholder="رمز الأصل (BTC, AAPL...)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="input-field text-xs font-mono flex-1 min-w-24"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field text-xs flex-1 min-w-32"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <input
            type="url"
            placeholder="رابط الشارت (اختياري)"
            value={chartUrl}
            onChange={(e) => setChartUrl(e.target.value)}
            className="input-field mb-3 text-sm"
          />

          {error && <p className="text-bear-400 text-sm mb-2">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري النشر...' : 'نشر'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
