import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Languages } from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { Button, Input, Label } from '@/components/ui'

export default function LoginPage() {
  const { t, toggleLang } = useI18n()
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) {
    const to = (location.state as { from?: string } | null)?.from ?? '/catalog'
    return <Navigate to={to} replace />
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email.trim(), password)
    if (err) {
      setError(t('login_failed'))
      setLoading(false)
      return
    }
    navigate('/catalog', { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-white to-primary-50/70 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-600 text-lg font-extrabold text-white">
              ز
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-ink">{t('brand')}</div>
              <div className="text-xs text-muted">{t('tagline')}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleLang}>
            <Languages size={16} />
            {t('language')}
          </Button>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-extrabold text-ink">{t('login_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('login_subtitle')}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label>{t('email')}</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.org"
              />
            </div>
            <div>
              <Label>{t('password')}</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? t('signing_in') : t('sign_in')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
