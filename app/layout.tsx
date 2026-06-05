import './globals.css'
import type { Metadata } from 'next'
import { getLocale, getDir } from '@/lib/i18n'
import { LocaleProvider } from '@/components/LocaleProvider'

export const metadata: Metadata = {
  title: 'Zawed — منصة المشتريات | B2B Procurement Platform',
  description:
    'Corporate office supplies and pantry procurement with tiered pricing, approval workflows, and automated invoicing.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale()
  const dir = getDir(locale)
  return (
    <html lang={locale} dir={dir}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
