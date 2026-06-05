'use client'

import { useLocale } from './LocaleProvider'

export default function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()

  const switchLocale = async () => {
    const next = locale === 'en' ? 'ar' : 'en'
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    })
    window.location.reload()
  }

  return (
    <button
      onClick={switchLocale}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 transition-colors cursor-pointer ${className ?? ''}`}
      aria-label="Switch language"
    >
      <span className="text-base leading-none">{locale === 'en' ? '🌐' : '🌐'}</span>
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  )
}
