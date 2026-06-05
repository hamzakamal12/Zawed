'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/feed'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push(next)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
          autoComplete="current-password"
          className="input-field"
          placeholder="••••••"
        />
      </div>
      {error && <p className="text-bear-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-primary-400 tracking-tight">زاود</Link>
          <p className="text-slate-400 text-sm mt-2">منصة التداول الاجتماعي</p>
        </div>
        <div className="card p-6">
          <h1 className="text-slate-100 font-bold text-xl mb-5">تسجيل الدخول</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="text-slate-500 text-sm mt-4 text-center">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="text-primary-400 hover:text-primary-300">
              إنشاء حساب
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
