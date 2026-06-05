'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password }),
    })
    if (res.ok) {
      router.push('/feed')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'حدث خطأ، حاول مرة أخرى')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-primary-400 tracking-tight">زاود</Link>
          <p className="text-slate-400 text-sm mt-2">منصة التداول الاجتماعي</p>
        </div>
        <div className="card p-6">
          <h1 className="text-slate-100 font-bold text-xl mb-5">إنشاء حساب جديد</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-field"
                placeholder="محمد أحمد"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                className="input-field font-mono"
                placeholder="mohammed_trader"
              />
              <p className="text-slate-600 text-xs mt-1">حروف إنجليزية، أرقام، وشرطة سفلية فقط</p>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="input-field"
                placeholder="6 أحرف على الأقل"
              />
            </div>
            {error && <p className="text-bear-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
            </button>
          </form>
          <p className="text-slate-500 text-sm mt-4 text-center">
            لديك حساب؟{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
