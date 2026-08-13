import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ClipboardCheck,
  FileText,
  Languages,
  Receipt,
  Repeat,
  ShieldCheck,
  Snowflake,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { Button } from '@/components/ui'
import { CategoryGlyph } from '@/components/CategoryGlyph'
import { formatSDG } from '@/lib/format'
import type { StringKey } from '@/i18n/strings'

/**
 * The public face of the platform. Everything here is vector and text — no
 * photography — because the bandwidth budget that governs the app applies
 * doubly to the page a first-time visitor loads on a phone.
 *
 * The catalog categories are hard-coded rather than fetched: this page must
 * render for signed-out visitors, and RLS (correctly) gives the anonymous role
 * no read access at all.
 */

const CATEGORIES: { icon: string; ar: string; en: string }[] = [
  { icon: 'file-text', ar: 'ورق وطباعة', en: 'Paper & printing' },
  { icon: 'pen', ar: 'أدوات كتابة', en: 'Writing instruments' },
  { icon: 'folder', ar: 'ملفات وتنظيم', en: 'Filing & organization' },
  { icon: 'printer', ar: 'أحبار وطابعات', en: 'Ink & toner' },
  { icon: 'paperclip', ar: 'مستلزمات مكتبية', en: 'Desk supplies' },
  { icon: 'coffee', ar: 'ضيافة ومطبخ', en: 'Pantry & kitchen' },
  { icon: 'spray', ar: 'نظافة', en: 'Cleaning' },
  { icon: 'cpu', ar: 'إلكترونيات وملحقات', en: 'IT accessories' },
]

const FEATURES: { icon: typeof FileText; t: StringKey; b: StringKey }[] = [
  { icon: FileText, t: 'lp_f1_t', b: 'lp_f1_b' },
  { icon: ClipboardCheck, t: 'lp_f2_t', b: 'lp_f2_b' },
  { icon: Receipt, t: 'lp_f3_t', b: 'lp_f3_b' },
  { icon: Repeat, t: 'lp_f4_t', b: 'lp_f4_b' },
  { icon: WifiOff, t: 'lp_f5_t', b: 'lp_f5_b' },
  { icon: BarChart3, t: 'lp_f6_t', b: 'lp_f6_b' },
]

export default function LandingPage() {
  const { t, pick, lang, dir, toggleLang } = useI18n()
  const { session } = useAuth()
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600 font-extrabold text-white">
              ز
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-ink">{t('brand')}</div>
              <div className="hidden text-[11px] text-muted sm:block">{t('tagline')}</div>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm font-semibold text-muted lg:flex">
            <a href="#catalog" className="transition-colors hover:text-primary-700">
              {t('lp_nav_catalog')}
            </a>
            <a href="#how" className="transition-colors hover:text-primary-700">
              {t('lp_nav_how')}
            </a>
            <a href="#features" className="transition-colors hover:text-primary-700">
              {t('lp_nav_features')}
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={toggleLang}>
              <Languages size={16} />
              <span className="hidden sm:inline">{t('language')}</span>
            </Button>
            <Link to={session ? '/catalog' : '/login'}>
              <Button size="sm">{session ? t('lp_go_to_store') : t('sign_in')}</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-dotted pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="absolute -top-24 start-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary-200/25 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              <BadgeCheck size={14} />
              {t('lp_eyebrow')}
            </span>

            <h1 className="mt-5 text-3xl font-extrabold leading-[1.25] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {t('lp_hero_title')}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{t('lp_hero_sub')}</p>

            {/* Full-width and stacked on phones — side by side they came out
                uneven, since each button sized to its own label. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  {t('lp_cta_primary')}
                  <Arrow size={18} />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  {t('lp_cta_secondary')}
                </Button>
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={15} className="text-primary-500" />
              {t('lp_trust')}
            </p>
          </div>

          {/* Live-pricing demo. This is the product's core idea, so the hero
              shows it working rather than describing it. */}
          <div className="animate-fade-up" style={{ animationDelay: '90ms' }}>
            <PriceDemo />
          </div>
        </div>
      </section>

      {/* ── Why (the inflation problem) ───────────────────────────── */}
      <section className="border-y border-line bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t('lp_problem_title')}
            </h2>
            <p className="mt-3 text-muted">{t('lp_problem_sub')}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: TrendingUp, t: 'lp_p1_title' as StringKey, b: 'lp_p1_body' as StringKey },
              { icon: Snowflake, t: 'lp_p2_title' as StringKey, b: 'lp_p2_body' as StringKey },
              { icon: BadgeCheck, t: 'lp_p3_title' as StringKey, b: 'lp_p3_body' as StringKey },
            ].map(({ icon: Icon, t: title, b }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-bold text-ink">{t(title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(b)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────── */}
      <section id="catalog" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t('lp_cats_title')}
            </h2>
            <p className="mt-3 text-muted">{t('lp_cats_sub')}</p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div
                key={c.en}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lift"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <CategoryGlyph icon={c.icon} size={22} />
                </div>
                <span className="text-sm font-bold text-ink">{pick(c.ar, c.en)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section id="how" className="border-y border-line bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t('lp_how_title')}
          </h2>

          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ['lp_how_1_t', 'lp_how_1_b'],
              ['lp_how_2_t', 'lp_how_2_b'],
              ['lp_how_3_t', 'lp_how_3_b'],
            ].map(([title, body], i) => (
              <li key={title} className="relative rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-600 text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-bold text-ink">{t(title as StringKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(body as StringKey)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t('lp_feat_title')}
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, t: title, b }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-bold text-ink">{t(title)}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t(b)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="bg-brand-gradient relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center">
          <div className="bg-dotted pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t('lp_final_title')}</h2>
            <p className="mt-3 text-white/80">{t('lp_final_sub')}</p>
            <Link to="/login" className="mt-7 inline-block">
              <Button size="lg" variant="inverse">
                {t('lp_cta_primary')}
                <Arrow size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-canvas py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-600 text-xs font-extrabold text-white">
              ز
            </div>
            <span className="font-semibold text-ink">{t('brand')}</span>
          </div>
          <span className="text-xs">
            © {new Date().getFullYear()} {t('brand')} — {t('lp_footer_rights')}
          </span>
        </div>
      </footer>

      <span className="sr-only">{lang}</span>
    </div>
  )
}

/** Static illustration of the pricing engine — no network, no data access. */
function PriceDemo() {
  const { t } = useI18n()
  const FX = 2600
  const list = 11400
  const tier = 10300

  return (
    <div className="relative rounded-3xl border border-line bg-white p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-primary-700">{t('lp_demo_label')}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-good/12 px-2.5 py-0.5 text-[11px] font-bold text-[#0a7a0a]">
          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
          {t('in_stock')}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <CategoryGlyph icon="file-text" size={24} />
        </div>
        <div className="min-w-0">
          <div className="font-bold leading-snug text-ink">{t('lp_demo_product')}</div>
          <div className="font-mono text-[11px] text-muted">PAP-A4-80</div>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5">
          <dt className="text-sm text-muted">{t('lp_demo_list')}</dt>
          <dd className="nums-table font-bold text-ink">{formatSDG(list)}</dd>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2.5">
          <dt className="text-sm font-semibold text-primary-800">{t('lp_demo_tier')}</dt>
          <dd className="nums-table text-lg font-extrabold text-primary-700">{formatSDG(tier)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs text-muted">{t('lp_demo_fx')}</span>
        <span className="nums-table text-sm font-bold text-ink">
          {FX.toLocaleString('en-US')} <span className="text-xs font-normal text-muted">/ $1</span>
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">{t('lp_demo_note')}</p>
    </div>
  )
}
