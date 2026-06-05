import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <header className="border-b border-secondary-200 bg-white">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary-600 text-white flex items-center justify-center font-bold">
              Z
            </div>
            <span className="font-bold text-lg">Zawed</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Create company</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container-wide py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold tracking-wide uppercase">
              B2B Procurement
            </span>
            <h1 className="mt-4 text-4xl lg:text-5xl font-bold text-secondary-900 leading-tight">
              Corporate procurement, finally without the spreadsheets.
            </h1>
            <p className="mt-6 text-lg text-secondary-600 leading-relaxed">
              Zawed gives your office a structured catalog for pantry &amp; supplies,
              tiered volume pricing, multi-step approval, and automated tax invoices —
              all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Get started</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: 'Tiered Pricing', desc: 'Automatic volume discounts based on quantity.' },
              { title: 'Approval Workflow', desc: 'Staff submits, Manager approves, you save.' },
              { title: 'Cash on Delivery', desc: 'Simple checkout with PDF tax invoices.' },
              { title: 'Quick Reorder', desc: 'One click to repeat last month\'s order.' },
            ].map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-lg border border-secondary-200 bg-white shadow-sm"
              >
                <div className="text-primary-600 font-semibold text-sm">{f.title}</div>
                <p className="mt-2 text-sm text-secondary-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-secondary-200 bg-white py-8 text-center text-sm text-secondary-500">
        &copy; {new Date().getFullYear()} Zawed. All rights reserved.
      </footer>
    </div>
  )
}
