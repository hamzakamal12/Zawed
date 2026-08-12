# Zawed Supply — منصة توريدات المكاتب (B2B)

منصة توريد مستلزمات مكتبية للشركات والمنظمات في السودان (نحن **المورّد**، لسنا سوقاً
وسيطاً). العملاء يطلبون من كتالوجنا ونحن نُنفّذ، والدخل من هامش الربح + عقود توريد شهرية.

> B2B e-procurement platform for office supplies in Khartoum, Sudan. Arabic-first
> (RTL) with English toggle. Built to survive ~78% inflation, a depreciating SDG,
> and intermittent low-bandwidth connectivity.

## المبادئ المعمارية (تفرضها ظروف السوق)

- **لا يُخزَّن أي سعر نهائي بالجنيه أبداً.** سعر الجنيه يُحسب لحظياً من:
  `التكلفة بالدولار × (1 + هامش الربح) × سعر الصرف الحالي`، مع خصومات الكميات/العقود.
- **لقطة السعر (Snapshot):** عند إنشاء عرض سعر أو طلب، تُجمَّد قيمة الوحدة وسعر الصرف على
  البنود — فالمستندات التاريخية لا تتغيّر عند تحرّك سعر الصرف.
- **يتحمّل انقطاع الإنترنت:** كتالوج مُخزَّن، طلبات في طابور، إعادة إرسال عند العودة (PWA).
- **موجّه للأجهزة الضعيفة:** حمولة JS أولية < 200KB، صور خفيفة WebP.
- **الدفع خارج المنصة:** تحويل بنكي / بنكك / فوري / نقداً — المنصة تُسجّل حالة الدفع فقط.

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| الواجهة | React + Vite + TypeScript + Tailwind (RTL) — PWA |
| الحالة/البيانات | TanStack Query مع تخزين مؤقت للعمل دون اتصال |
| الخلفية | Supabase (PostgreSQL + Auth + RLS + Storage + Edge Functions) |
| الاستضافة | Cloudflare Pages (الواجهة) + Supabase المُدارة |
| الفواتير PDF | توليد على جهة العميل بخط عربي مضمّن (Cairo / Noto Naskh) |

## الأدوار (مفروضة عبر RLS وليس إخفاء الواجهة فقط)

`admin` · `sales` · `warehouse` · `customer_admin` · `customer_requester`
— العميل لا يمكنه إطلاقاً قراءة صفوف شركة أخرى، ولا رؤية التكلفة/الهامش (`product_prices`).

## ما تم إنجازه حتى الآن — طبقة قاعدة البيانات (بوابة المرحلة 1)

تحت `supabase/`:

```
supabase/
  migrations/
    20260812090000_schema.sql    الجداول + الأنواع + الفهارس + ترقيم المستندات + سجل التدقيق
    20260812090100_pricing.sql   دالة get_price ومحرك التسعير الحي
    20260812090200_rls.sql       تفعيل RLS + سياسات كل الجداول + دوال الأدوار
  seed.sql                        الكتالوج: 8 أصناف + 44 منتج + أسعار + مخزون + خصومات كمية
  seed_demo_users.sql             مدير + شركة منظمة (NGO) + طلب/فاتورة/دفعة تجريبية
  config.toml
```

**16 جدولاً:** companies, profiles, categories, products, product_prices, fx_rates,
price_tiers, inventory, quotations, quotation_items, orders, order_items, invoices,
payments, recurring_orders, audit_log.

**محرك التسعير `get_price(product_id, company_id, qty)`** يُرجع
`{ unit_price_sdg, unit_price_usd, fx_rate_used, discount_applied, tier_name }`
بالقواعد: السعر الأساسي بالدولار ← أفضل خصم (العقدي للشركة يتقدّم على العام، والأعمق كمية)
← تحويل بسعر الصرف الأحدث ← تقريب الجنيه لأعلى لأقرب 100.

> جميع الملفات تم **التحقق منها فعلياً** على PostgreSQL 16 محلياً: تُطبَّق بلا أخطاء،
> والتسعير والترقيم وعزل RLS كلها تعمل كما هو متوقّع (العميل يرى شركته فقط، والتكلفة مخفيّة).

### التطبيق على مشروع Supabase

**عبر Supabase CLI (مستحسن):**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # يطبّق ملفات migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
psql "$SUPABASE_DB_URL" -f supabase/seed_demo_users.sql
```

**أو عبر SQL Editor في لوحة Supabase:** الصق محتوى ملفات `migrations/*` بالترتيب، ثم
`seed.sql` ثم `seed_demo_users.sql`.

### حسابات تجريبية (كلمة المرور: `password123`)

| البريد | الدور |
|--------|-------|
| `admin@zawed.com`  | admin |
| `buyer@relief.org` | customer_admin — منظمة الإغاثة الدولية (NGO) |

## خطة البناء

- **المرحلة 1 (MVP):** المصادقة + الشركات + الكتالوج + محرك التسعير + سعر الصرف + السلة +
  إنشاء الطلب + قائمة طلبات الإدارة. ← *قاعدة البيانات جاهزة الآن؛ الواجهة تالية.*
- **المرحلة 2:** منشئ عروض الأسعار + توليد PDF + الفواتير + تسجيل المدفوعات.
- **المرحلة 3:** الطلبات المتكرّرة + سير الموافقات + التقارير + طبقة PWA دون اتصال.

## الخطوة التالية

كما طلب مخطّط البناء: **تم إخراج السكيما الكاملة وسياسات RLS، وننتظر تأكيدك قبل كتابة
كود الواجهة (React).** بعد موافقتك أبدأ سقالة مشروع Vite + React + Tailwind + Supabase
وأبني تدفّق المرحلة 1 من طرف إلى طرف.

## الرخصة

MIT
