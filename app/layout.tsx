import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zawed — B2B Procurement Platform',
  description:
    'Corporate office supplies and pantry procurement with tiered pricing, approval workflows, and automated invoicing.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
