import { cookies } from 'next/headers'
import en from '@/messages/en.json'
import ar from '@/messages/ar.json'

export type Locale = 'en' | 'ar'
export type Messages = typeof en

const messagesMap: Record<Locale, Messages> = { en, ar }

export function getLocale(): Locale {
  try {
    const locale = cookies().get('NEXT_LOCALE')?.value
    return locale === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en'
  }
}

export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function getMessages(locale?: Locale): Messages {
  return messagesMap[locale ?? getLocale()]
}
