import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { strings, type Lang, type StringKey } from './strings'

interface I18nValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  t: (key: StringKey, vars?: Record<string, string | number>) => string
  /** Picks the Arabic or English column of a DB row. */
  pick: (ar: string | null | undefined, en: string | null | undefined) => string
  toggleLang: () => void
}

const I18nContext = createContext<I18nValue | null>(null)
const STORAGE_KEY = 'zawed.lang'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'ar'
  })

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let out: string = strings[lang][key] ?? strings.ar[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(`{${k}}`, String(v))
        }
      }
      return out
    },
    [lang],
  )

  const pick = useCallback(
    (ar: string | null | undefined, en: string | null | undefined) =>
      (lang === 'en' ? en || ar : ar || en) ?? '',
    [lang],
  )

  const value = useMemo<I18nValue>(
    () => ({ lang, dir, t, pick, toggleLang: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')) }),
    [lang, dir, t, pick],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
