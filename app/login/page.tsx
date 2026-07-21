'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label } from '@/components/ui/Input'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'بيانات الدخول غير صحيحة')
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('خطأ في الاتصال')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-primary-50/60">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
              ز
            </div>
            <span className="font-extrabold text-xl">زوّد بيوتي</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-secondary-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-secondary-900">مرحباً بعودتك</h1>
          <p className="text-sm text-secondary-500 mt-1">سجّلي الدخول لمتابعة التسوّق.</p>

          <Suspense fallback={<div className="mt-6 h-44" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-sm text-secondary-600 text-center">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="text-primary-600 font-medium hover:underline">
              أنشئ حساباً جديداً
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
