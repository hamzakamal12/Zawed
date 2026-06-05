import Link from 'next/link'
import Button from '@/components/ui/Button'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getMessages } from '@/lib/i18n'
import {
  FiPackage,
  FiCheckSquare,
  FiFileText,
  FiRepeat,
  FiArrowRight,
  FiDroplet,
  FiPrinter,
  FiEdit3,
  FiShield,
} from 'react-icons/fi'

export default function HomePage() {
  const m = getMessages()

  const FEATURES = [
    {
      icon: <FiShield className="w-5 h-5" />,
      title: m.home.f1Title,
      desc: m.home.f1Desc,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: <FiCheckSquare className="w-5 h-5" />,
      title: m.home.f2Title,
      desc: m.home.f2Desc,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: <FiFileText className="w-5 h-5" />,
      title: m.home.f3Title,
      desc: m.home.f3Desc,
      color: 'bg-violet-100 text-violet-600',
    },
    {
      icon: <FiRepeat className="w-5 h-5" />,
      title: m.home.f4Title,
      desc: m.home.f4Desc,
      color: 'bg-amber-100 text-amber-600',
    },
  ]

  const CATEGORIES = [
    {
      icon: <FiDroplet className="w-6 h-6" />,
      label: m.home.catBeverages,
      desc: m.home.catBeveragesDesc,
      color: 'bg-sky-100 text-sky-600',
    },
    {
      icon: <FiPrinter className="w-6 h-6" />,
      label: m.home.catPrinting,
      desc: m.home.catPrintingDesc,
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: <FiEdit3 className="w-6 h-6" />,
      label: m.home.catOffice,
      desc: m.home.catOfficeDesc,
      color: 'bg-rose-100 text-rose-600',
    },
    {
      icon: <FiPackage className="w-6 h-6" />,
      label: m.home.catCleaning,
      desc: m.home.catCleaningDesc,
      color: 'bg-emerald-100 text-emerald-600',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-secondary-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-secondary-100 bg-white/90 backdrop-blur-sm">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-brand-blue text-white flex items-center justify-center font-extrabold shadow-sm">
              Z
            </div>
            <div>
              <span className="font-extrabold text-secondary-900 tracking-tight">Zawed</span>
              <span className="ms-1.5 text-xs text-secondary-400 font-medium hidden sm:inline">Procurement</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">{m.auth.signInBtn}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{m.home.getStarted}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-hero-gradient text-white">
          <div className="container-wide py-20 lg:py-28">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/90 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {m.home.heroBadge}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-balance">
                {m.home.heroTitle}{' '}
                <span className="text-sky-300">{m.home.heroHighlight}</span>
              </h1>
              <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
                {m.home.heroDesc}
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-primary-700 hover:bg-white/90 shadow-lg hover:shadow-xl from-white to-white">
                    {m.home.ctaRegister} <FiArrowRight />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                    {m.home.ctaSignIn}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {/* Wave divider */}
          <div className="h-12 bg-secondary-50" style={{ clipPath: 'ellipse(110% 100% at 50% 100%)' }} />
        </section>

        {/* Features */}
        <section className="container-wide py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
              {m.home.featuresTitle}
            </h2>
            <p className="mt-3 text-secondary-500 max-w-xl mx-auto">
              {m.home.featuresDesc}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-white border border-secondary-100 shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-secondary-900 text-sm">{f.title}</h3>
                <p className="mt-1.5 text-sm text-secondary-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="bg-white border-y border-secondary-100 py-16">
          <div className="container-wide">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                {m.home.categoriesTitle}
              </h2>
              <p className="mt-2 text-secondary-500 text-sm">{m.home.categoriesDesc}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => (
                <Link key={cat.label} href="/login">
                  <div className="group text-center p-6 rounded-2xl border border-secondary-100 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 cursor-pointer">
                    <div className={`w-12 h-12 rounded-2xl ${cat.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      {cat.icon}
                    </div>
                    <div className="font-semibold text-secondary-900 text-sm">{cat.label}</div>
                    <div className="text-xs text-secondary-500 mt-1">{cat.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="container-wide py-16">
          <div className="bg-hero-gradient rounded-2xl p-10 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {m.home.bannerTitle}
            </h2>
            <p className="mt-3 text-white/70 max-w-md mx-auto">
              {m.home.bannerDesc}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-white/90 shadow-lg from-white to-white">
                  {m.home.bannerCta} <FiArrowRight />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-secondary-100 bg-white py-8">
        <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-600 to-brand-blue text-white flex items-center justify-center font-bold text-xs">Z</div>
            <span className="font-semibold text-secondary-600">Zawed</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Zawed — {m.home.footerTag}</span>
        </div>
      </footer>
    </div>
  )
}
