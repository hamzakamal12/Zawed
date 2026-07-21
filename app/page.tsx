import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-50/60">
      <header className="border-b border-secondary-200 bg-white/80 backdrop-blur">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
              ز
            </div>
            <span className="font-extrabold text-lg">زوّد بيوتي</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">إنشاء حساب</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container-wide py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
              متجر التجميل الأول في السودان
            </span>
            <h1 className="mt-4 text-4xl lg:text-5xl font-extrabold text-secondary-900 leading-tight">
              جمالكِ يبدأ من هنا ✨
            </h1>
            <p className="mt-6 text-lg text-secondary-600 leading-relaxed">
              مستحضرات تجميل وعناية <strong>أصلية 100%</strong> — مكياج، عناية بالبشرة والشعر،
              وعطور. اطلبي أونلاين، وادفعي عند الاستلام، مع توصيل سريع لباب بيتك.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">ابدئي التسوّق</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  لديّ حساب بالفعل
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '💄', title: 'منتجات أصلية', desc: 'ضمان الأصالة على كل قطعة نبيعها.' },
              { icon: '🚚', title: 'توصيل سريع', desc: 'لكل مدن السودان، لباب بيتك.' },
              { icon: '💵', title: 'الدفع عند الاستلام', desc: 'ادفعي كاش وقت ما يوصلك الطلب.' },
              { icon: '🎁', title: 'عروض مستمرة', desc: 'خصومات وباقات على المنتجات المميزة.' },
            ].map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-primary-100 bg-white shadow-sm"
              >
                <div className="text-3xl">{f.icon}</div>
                <div className="text-primary-700 font-bold text-sm mt-2">{f.title}</div>
                <p className="mt-1 text-sm text-secondary-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-secondary-200 bg-white py-8 text-center text-sm text-secondary-500">
        &copy; {new Date().getFullYear()} زوّد بيوتي. جميع الحقوق محفوظة.
      </footer>
    </div>
  )
}
