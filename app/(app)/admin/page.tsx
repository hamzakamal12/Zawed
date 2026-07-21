import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default async function AdminDashboardPage() {
  await requireRole(['ADMIN'])

  const [totalCustomers, totalProducts, allProducts, pendingOrders, revenueAgg, recentOrders] =
    await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count(),
      prisma.product.findMany({ orderBy: { stock: 'asc' }, take: 30 }),
      prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] } } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

  const lowStock = allProducts.filter((p) => p.stock <= p.lowStockThreshold).slice(0, 8)
  const revenue = revenueAgg._sum.totalAmount ? Number(revenueAgg._sum.totalAmount) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">لوحة الإدارة</h1>
        <p className="text-secondary-500 mt-1">نظرة عامة على المتجر.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="العملاء" value={String(totalCustomers)} />
        <Stat label="المنتجات" value={String(totalProducts)} />
        <Stat label="طلبات قيد المعالجة" value={String(pendingOrders)} />
        <Stat label="إيرادات مُحصّلة" value={formatCurrency(revenue)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>تنبيه: مخزون منخفض</CardTitle>
              <Link href="/admin/products" className="text-sm text-primary-600 hover:underline">
                إدارة المنتجات →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <div className="py-12 text-center text-secondary-500">كل المنتجات فوق الحد الأدنى 🎉</div>
            ) : (
              <ul className="divide-y divide-secondary-100">
                {lowStock.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-secondary-500">{p.sku}</div>
                    </div>
                    <Badge variant={p.stock === 0 ? 'danger' : 'warning'}>
                      {p.stock} / {p.lowStockThreshold}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أحدث الطلبات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-secondary-500">لا توجد طلبات بعد.</div>
            ) : (
              <ul className="divide-y divide-secondary-100">
                {recentOrders.map((o) => (
                  <li key={o.id} className="p-4 flex items-center justify-between">
                    <div>
                      <Link href={`/orders/${o.id}`} className="font-medium hover:text-primary-600">
                        {o.orderNumber}
                      </Link>
                      <div className="text-xs text-secondary-500">
                        {o.customerName} · {formatDateTime(o.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(Number(o.totalAmount))}
                      </span>
                      <Badge variant={o.status === 'DELIVERED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'warning'}>
                        {o.status === 'DELIVERED'
                          ? 'تم التوصيل'
                          : o.status === 'CONFIRMED'
                            ? 'قيد التوصيل'
                            : o.status === 'CANCELLED'
                              ? 'ملغي'
                              : 'قيد المعالجة'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-medium text-secondary-500">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}
