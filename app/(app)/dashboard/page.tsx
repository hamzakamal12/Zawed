import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { FiArrowRight, FiPlus } from 'react-icons/fi'

export default async function DashboardPage() {
  const session = await requireSession()

  const [stats, recentOrders, pendingApprovals, company] = await Promise.all([
    prisma.order.aggregate({
      where: { companyId: session.companyId ?? '' },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { companyId: session.companyId ?? '' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { placedBy: true },
    }),
    prisma.cart.count({
      where: { companyId: session.companyId ?? '', status: 'PENDING_APPROVAL' },
    }),
    prisma.company.findUnique({ where: { id: session.companyId ?? '' } }),
  ])

  const totalSpend = stats._sum.totalAmount ? Number(stats._sum.totalAmount) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">
          Welcome back, {session.name.split(' ')[0]}
        </h1>
        <p className="text-secondary-500 mt-1">
          {company?.name ?? 'Your company'} — {roleLabel(session.role)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Orders placed" value={String(stats._count)} />
        <StatCard label="Total spend" value={formatCurrency(totalSpend)} />
        <StatCard label="Pending approvals" value={String(pendingApprovals)} />
        <StatCard
          label="Company code"
          value={company?.id ?? '—'}
          hint="Share to invite teammates"
          small
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent orders</CardTitle>
              <Link
                href="/orders"
                className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1"
              >
                View all <FiArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-secondary-500 mb-4">No orders yet.</p>
                <Link href="/products">
                  <Button size="sm">
                    <FiPlus /> Browse catalog
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
                      <div className="text-xs text-secondary-500 mt-0.5">
                        {formatDate(order.createdAt)} · by {order.placedBy.name}
                      </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/products" className="block">
              <Button variant="outline" className="w-full justify-start">
                Browse catalog
              </Button>
            </Link>
            <Link href="/cart" className="block">
              <Button variant="outline" className="w-full justify-start">
                View my cart
              </Button>
            </Link>
            <Link href="/orders" className="block">
              <Button variant="outline" className="w-full justify-start">
                Reorder previous
              </Button>
            </Link>
            {(session.role === 'MANAGER' || session.role === 'ADMIN') && (
              <Link href="/approvals" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Review approvals ({pendingApprovals})
                </Button>
              </Link>
            )}
            {session.role === 'ADMIN' && (
              <Link href="/admin" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Admin dashboard
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  small,
}: {
  label: string
  value: string
  hint?: string
  small?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-medium text-secondary-500 uppercase tracking-wide">{label}</div>
        <div
          className={
            small
              ? 'text-xs font-mono mt-1 text-secondary-900 break-all'
              : 'text-2xl font-bold text-secondary-900 mt-1'
          }
        >
          {value}
        </div>
        {hint && <div className="text-xs text-secondary-400 mt-1">{hint}</div>}
      </CardContent>
    </Card>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="success">Paid</Badge>
  if (status === 'CANCELLED') return <Badge variant="danger">Cancelled</Badge>
  return <Badge variant="warning">Pending payment</Badge>
}

function roleLabel(role: string) {
  return role === 'STAFF' ? 'Staff' : role === 'MANAGER' ? 'Procurement Manager' : 'System Admin'
}
