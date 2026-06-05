'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label } from '@/components/ui/Input'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useMessages } from '@/components/LocaleProvider'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const m = useMessages()
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
        setError(data.error || m.auth.invalidCreds)
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError(m.auth.networkError)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">{m.auth.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <Label htmlFor="password">{m.auth.passwordLabel}</Label>
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
        {loading ? m.auth.signingIn : m.auth.signInBtn}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const m = useMessages()
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-secondary-50">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-primary-600 text-white flex items-center justify-center font-bold">
              Z
            </div>
            <span className="font-bold text-xl">Zawed</span>
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="bg-white rounded-lg border border-secondary-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-secondary-900">{m.auth.loginTitle}</h1>
          <p className="text-sm text-secondary-500 mt-1">{m.auth.loginDesc}</p>

          <Suspense fallback={<div className="mt-6 h-44" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-sm text-secondary-600 text-center">
            {m.auth.newToZawed}{' '}
            <Link href="/register" className="text-primary-600 font-medium hover:underline">
              {m.auth.createCompany}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
