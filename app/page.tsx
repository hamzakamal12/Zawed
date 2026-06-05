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
              <Button size="sm">Register your NGO</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container-wide py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold tracking-wide uppercase">
              NGO Procurement Platform
            </span>
            <h1 className="mt-4 text-4xl lg:text-5xl font-bold text-secondary-900 leading-tight">
              Everything your NGO needs, ordered in minutes.
            </h1>
            <p className="mt-6 text-lg text-secondary-600 leading-relaxed">
              Zawed gives NGOs and non-profits a structured catalog for office essentials —
              coffee, tea, water, toner, ink, and more — with special NGO pricing, a built-in
              approval workflow, and automated tax invoices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Register your NGO</Button>
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
              {
                title: 'Special NGO Pricing',
                desc: 'Verified NGOs unlock exclusive discounts on top of volume tiered pricing.',
              },
              {
                title: 'Approval Workflow',
                desc: 'Staff submits, Procurement Manager approves — full audit trail.',
              },
              {
                title: 'Cash on Delivery',
                desc: 'Simple checkout with automated PDF tax invoices.',
              },
              {
                title: 'Recurring Orders',
                desc: 'Set weekly or monthly subscriptions for essentials like coffee and toner.',
              },
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

        {/* Product categories showcase */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-secondary-900 text-center mb-10">
            Everything your organization needs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: '☕', label: 'Beverages', desc: 'Coffee, tea, water & juice' },
              { emoji: '🖨️', label: 'Printing', desc: 'Toner, ink & paper' },
              { emoji: '✏️', label: 'Office Supplies', desc: 'Stationery & equipment' },
              { emoji: '🧴', label: 'Cleaning', desc: 'Sanitizer, wipes & soap' },
            ].map((cat) => (
              <div
                key={cat.label}
                className="text-center p-6 rounded-xl border border-secondary-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-3">{cat.emoji}</div>
                <div className="font-semibold text-secondary-900">{cat.label}</div>
                <div className="text-sm text-secondary-500 mt-1">{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-secondary-200 bg-white py-8 text-center text-sm text-secondary-500">
        &copy; {new Date().getFullYear()} Zawed — Built for NGOs &amp; non-profits.
      </footer>
    </div>
  )
}
