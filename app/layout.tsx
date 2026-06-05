import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'زاود — منصة التداول الاجتماعي',
  description:
    'منصة التواصل والتحليل المالي للمستثمرين والمتداولين — أسهم، عملات رقمية، عقارات، وأكثر',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="ltr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
