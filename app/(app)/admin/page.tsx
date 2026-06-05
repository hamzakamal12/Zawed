import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default async function AdminDashboardPage() {
  await requireRole(['ADMIN'])

  const [totalCompanies, totalUsers, totalProducts, lowStock, pendingOrders, recentOrders] =
    await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.findMany({
        where: {
          stock: { lte: prisma.product.fields.lowStockThreshold } as never,
        },
        orderBy: { stock: 'asc' },
        take: 8,
      }).catch(async () =>
        prisma.product.findMany({
          orderBy: { stock: 'asc' },
          take: 8,
        }),
      ),
      prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { company: true, placedBy: true },
      }),
    ])

  // Filter low stock client-side because Prisma's fields ref may not be supported in all versions.
  const lowStockReal = lowStock.filter((p) => p.stock <= p.lowStockThreshold)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Admin overview</h1>
        <p className="text-secondary-500 mt-1">Global stats across all NGOs and organizations on the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Organizations" value={totalCompanies} />
        <Stat label="Users" value={totalUsers} />
        <Stat label="Products" value={totalProducts} />
        <Stat label="Pending orders" value={pendingOrders} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low stock alert</CardTitle>
              <Link href="/admin/products" className="text-sm text-primary-600 hover:underline">
                Manage products →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockReal.length === 0 ? (
              <div className="py-12 text-center text-secondary-500">
                All products above their threshold. 🎉
              </div>
            ) : (
              <ul className="divide-y divide-secondary-100">
                {lowStockReal.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-secondary-500">SKU {p.sku}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.stock === 0 ? 'danger' : 'warning'}>
                        {p.stock} / {p.lowStockThreshold} threshold
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent orders (all companies)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-secondary-500">No orders yet.</div>
            ) : (
              <ul className="divide-y divide-secondary-100">
                {recentOrders.map((o) => (
                  <li key={o.id} className="p-4 flex items-center justify-between">
                    <div>
                      <Link href={`/orders/${o.id}`} className="font-medium hover:text-primary-600">
                        {o.orderNumber}
                      </Link>
                      <div className="text-xs text-secondary-500">
                        {o.company.name} · {formatDateTime(o.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(Number(o.totalAmount))}
                      </span>
                      <Badge variant={o.status === 'PAID' ? 'success' : 'warning'}>
                        {o.status === 'PENDING_PAYMENT' ? 'Pending' : 'Paid'}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-medium uppercase text-secondary-500">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}
