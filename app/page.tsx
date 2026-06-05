import Link from 'next/link'

const features = [
  {
    icon: '📊',
    title: 'تحليلات فنية موثوقة',
    desc: 'نشر تحليلات السوق مع الشارتات والتوقعات السعرية للعملات والأسهم والعقارات',
  },
  {
    icon: '🏆',
    title: 'مؤشر الموثوقية',
    desc: 'كل محلل لديه نقاط موثوقية مبنية على دقة توقعاته السابقة — احمِ نفسك من المحللين الوهميين',
  },
  {
    icon: '👥',
    title: 'مجتمعات متخصصة',
    desc: 'انضم لمجتمع العملات الرقمية، الأسهم، العقارات، أو المشاريع الناشئة — كل اهتمام له مكانه',
  },
  {
    icon: '💬',
    title: 'غرف النقاش الحية',
    desc: 'تابع نقاشات السوق في الوقت الفعلي مع مجتمع من المتداولين والمستثمرين',
  },
]

const stats = [
  { value: '10K+', label: 'مستثمر ومتداول' },
  { value: '50+', label: 'محلل موثق' },
  { value: '5', label: 'مجتمعات متخصصة' },
  { value: '95%', label: 'رضا المستخدمين' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-slate-100" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="text-2xl font-black text-primary-400 tracking-tight">زاود</div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-wide py-20 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-bull-400 rounded-full animate-pulse" />
          منصة التداول الاجتماعي #1 في المنطقة
        </div>

        <h1 className="text-4xl lg:text-6xl font-black text-slate-100 leading-tight mb-6">
          مجتمع المستثمرين والمتداولين{' '}
          <span className="text-primary-400">الموثوقين</span>
        </h1>

        <p className="text-slate-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          بديل منظم وموثوق عن قنوات التليجرام العشوائية — شارك تحليلاتك، تابع المحللين الأفضل،
          وتداول بثقة أكبر
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-8 py-3">
            انضم مجاناً
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3">
            لدي حساب بالفعل
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-primary-400">{s.value}</div>
              <div className="text-slate-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container-wide py-16 border-t border-border">
        <h2 className="text-slate-100 font-bold text-2xl lg:text-3xl text-center mb-12">
          كل ما يحتاجه المستثمر في مكان واحد
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-5 hover:border-primary-500/30 transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-slate-100 font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-wide py-16 border-t border-border">
        <h2 className="text-slate-100 font-bold text-2xl lg:text-3xl text-center mb-12">
          كيف يعمل التطبيق؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              step: '01',
              title: 'أنشئ حسابك',
              desc: 'سجّل مجاناً واختر مجتمعاتك المفضلة — عملات رقمية، أسهم، عقارات، أو أكثر',
            },
            {
              step: '02',
              title: 'تابع المحللين الموثوقين',
              desc: 'استعرض نقاط موثوقية المحللين وسجلاتهم السابقة قبل اتباع توصياتهم',
            },
            {
              step: '03',
              title: 'شارك وتعلم',
              desc: 'انشر تحليلاتك، ناقش في الغرف الحية، وابنِ سمعتك كمحلل موثوق',
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-primary-400 text-4xl font-black mb-4 opacity-50">{item.step}</div>
              <h3 className="text-slate-100 font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-narrow py-16 border-t border-border text-center">
        <h2 className="text-slate-100 font-bold text-2xl lg:text-3xl mb-4">
          ابدأ رحلتك الاستثمارية الصحيحة
        </h2>
        <p className="text-slate-400 mb-8">انضم لآلاف المستثمرين والمتداولين الذين يثقون بزاود</p>
        <Link href="/register" className="btn-primary text-base px-10 py-3">
          إنشاء حساب مجاني
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8 text-center text-sm text-slate-600">
        © {new Date().getFullYear()} زاود — منصة التداول الاجتماعي. جميع الحقوق محفوظة.
      </footer>
    </div>
  )
}
