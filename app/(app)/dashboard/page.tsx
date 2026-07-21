import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import ProductCard from '@/components/products/ProductCard'
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi'

export default async function DashboardPage() {
  const session = await requireSession()

  const [stats, recentOrders, featured, activeCart] = await Promise.all([
    prisma.order.aggregate({
      where: { placedById: session.sub },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { placedById: session.sub },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: { active: true, featured: true, stock: { gt: 0 } },
      include: { category: true, priceTiers: { orderBy: { minQty: 'asc' } } },
      take: 4,
    }),
    prisma.cart.findFirst({
      where: { userId: session.sub, status: 'ACTIVE' },
      include: { _count: { select: { items: true } } },
    }),
  ])

  const totalSpend = stats._sum.totalAmount ? Number(stats._sum.totalAmount) : 0
  const cartCount = activeCart?._count.items ?? 0
  const featuredSerialized = featured.map((p) => ({
    ...p,
    priceTiers: p.priceTiers.map((t) => ({ ...t, unitPrice: t.unitPrice.toString() })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">
          أهلاً {session.name.split(' ')[0]} 👋
        </h1>
        <p className="text-secondary-500 mt-1">نورتِ زوّد بيوتي — جمالكِ يبدأ من هنا.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="عدد طلباتي" value={String(stats._count)} />
        <StatCard label="إجمالي مشترياتي" value={formatCurrency(totalSpend)} />
        <StatCard label="في السلة الآن" value={`${cartCount} منتج`} />
        <Card className="bg-primary-600 text-white">
          <CardContent className="pt-6">
            <div className="text-xs font-medium opacity-90">جاهزة للتسوّق؟</div>
            <Link href="/products">
              <Button variant="secondary" size="sm" className="mt-2 bg-white text-primary-700 hover:bg-primary-50">
                <FiShoppingBag /> تصفّحي المتجر
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {featuredSerialized.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-secondary-900">منتجات مميّزة ✨</h2>
            <Link href="/products" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
              عرض الكل <FiArrowLeft />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredSerialized.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>آخر طلباتي</CardTitle>
            <Link href="/orders" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
              عرض الكل <FiArrowLeft />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-secondary-500 mb-4">لا توجد طلبات بعد.</p>
              <Link href="/products">
                <Button size="sm">
                  <FiShoppingBag /> ابدئي التسوّق
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-secondary-100">
              {recentOrders.map((order) => (
                <li key={order.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-secondary-900 hover:text-primary-600"
                    >
                      {order.orderNumber}
                    </Link>
                    <div className="text-xs text-secondary-500 mt-0.5">{formatDate(order.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(Number(order.totalAmount))}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-medium text-secondary-500">{label}</div>
        <div className="text-2xl font-bold text-secondary-900 mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DELIVERED':
      return <Badge variant="success">تم التوصيل</Badge>
    case 'CONFIRMED':
      return <Badge variant="info">قيد التوصيل</Badge>
    case 'CANCELLED':
      return <Badge variant="danger">ملغي</Badge>
    default:
      return <Badge variant="warning">قيد المعالجة</Badge>
  }
}
