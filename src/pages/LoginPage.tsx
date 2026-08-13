import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Languages, PackageCheck, ShieldCheck, TrendingUp } from 'lucide-react'
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
    const { error: err, isNetworkError } = await signIn(email.trim(), password)
    if (err) {
      setError(isNetworkError ? t('network_error') : t('login_failed'))
      setLoading(false)
      return
    }
    navigate('/catalog', { replace: true })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only. Carries the promise; the form stays clean. */}
      <aside className="bg-brand-gradient relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="bg-dotted pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-xl font-extrabold text-white backdrop-blur">
              ز
            </div>
            <div className="leading-tight text-white">
              <div className="text-lg font-extrabold">{t('brand')}</div>
              <div className="text-xs text-white/70">{t('tagline')}</div>
            </div>
          </div>
        </div>

        <div className="relative max-w-md text-white">
          <h2 className="text-3xl font-extrabold leading-snug">{t('auth_headline')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{t('auth_sub')}</p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: TrendingUp, text: t('auth_point_pricing') },
              { icon: PackageCheck, text: t('auth_point_orders') },
              { icon: ShieldCheck, text: t('auth_point_docs') },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon size={16} />
                </span>
                <span className="text-sm text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} {t('brand')}
        </div>
      </aside>

      {/* Form side */}
      <main className="flex flex-col justify-center bg-canvas px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="grid h-11 w-11 bg-brand-gradient place-items-center rounded-xl text-lg font-extrabold text-white">
                ز
              </div>
              <div className="leading-tight">
                <div className="font-extrabold text-ink">{t('brand')}</div>
                <div className="text-[11px] text-muted">{t('tagline')}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleLang}>
              <Languages size={16} />
              {t('language')}
            </Button>
          </div>

          <div className="animate-fade-up">
            <h1 className="text-2xl font-extrabold text-ink">{t('login_title')}</h1>
            <p className="mt-1.5 text-sm text-muted">{t('login_subtitle')}</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
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
                <div className="animate-fade-up rounded-lg border border-status-critical/25 bg-status-critical/5 px-3 py-2.5 text-sm font-medium text-[#a52c2c]">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? t('signing_in') : t('sign_in')}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
