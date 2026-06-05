'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const POST_TYPES = [
  { value: 'DISCUSSION', label: 'نقاش', icon: '💬', desc: 'شارك رأيك أو اطرح سؤالاً' },
  { value: 'ANALYSIS', label: 'تحليل فني', icon: '📊', desc: 'تحليل السوق والأصول' },
  { value: 'PREDICTION', label: 'توقع', icon: '🎯', desc: 'توقع حركة سعرية محددة' },
  { value: 'NEWS', label: 'خبر', icon: '📰', desc: 'شارك خبراً مالياً مهماً' },
]

const CATEGORIES = [
  { value: 'GENERAL', label: 'عام', icon: '💡' },
  { value: 'CRYPTO', label: 'عملات رقمية', icon: '₿' },
  { value: 'STOCKS', label: 'أسهم', icon: '📈' },
  { value: 'REAL_ESTATE', label: 'عقارات', icon: '🏠' },
  { value: 'FOREX', label: 'فوركس', icon: '💱' },
  { value: 'COMMODITIES', label: 'سلع', icon: '🥇' },
  { value: 'STARTUPS', label: 'مشاريع ناشئة', icon: '🚀' },
]

export default function CreatePage() {
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
          type, category,
          title: title.trim() || undefined,
          content: content.trim(),
          ticker: ticker.trim().toUpperCase() || undefined,
          chartUrl: chartUrl.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'حدث خطأ، حاول مرة أخرى')
      } else {
        router.push('/feed')
        router.refresh()
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-slate-100 font-bold text-2xl mb-6">نشر تحليل جديد</h1>

      <form onSubmit={submit} className="space-y-5">
        {/* Type */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-2">نوع المنشور</label>
          <div className="grid grid-cols-2 gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                  ${type === t.value
                    ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                    : 'border-border bg-surface hover:bg-surface-2 text-slate-400'
                  }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div>
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs opacity-70">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-2">الفئة</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all
                  ${category === c.value
                    ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                    : 'border-border text-slate-400 hover:bg-surface-2'
                  }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-1">العنوان (اختياري)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان مختصر وواضح..."
            className="input-field"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-1">المحتوى *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="شارك تحليلك، توقعاتك، أو رأيك بالتفصيل..."
            rows={6}
            required
            className="input-field resize-none"
          />
          <div className="text-xs text-slate-600 mt-1 text-left">{content.length} / 5000</div>
        </div>

        {/* Ticker & Chart URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-sm font-medium block mb-1">رمز الأصل (اختياري)</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="BTC, AAPL, EUR/USD..."
              className="input-field font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm font-medium block mb-1">رابط الشارت (اختياري)</label>
            <input
              type="url"
              value={chartUrl}
              onChange={(e) => setChartUrl(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>
        </div>

        {error && <p className="text-bear-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري النشر...' : 'نشر الآن'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
