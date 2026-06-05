import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import {
  FiArrowRight,
  FiPlus,
  FiShoppingBag,
  FiDollarSign,
  FiClock,
  FiPackage,
  FiShoppingCart,
  FiRepeat,
  FiCheckSquare,
  FiSettings,
} from 'react-icons/fi'

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
  const firstName = session.name.split(' ')[0]

  const STATS = [
    {
      label: 'Total Orders',
      value: String(stats._count),
      icon: <FiShoppingBag className="w-5 h-5" />,
      bg: 'bg-stat-blue',
      iconColor: 'text-blue-600 bg-blue-100',
      accent: 'bg-gradient-to-r from-blue-400 to-blue-600',
    },
    {
      label: 'Total Spend',
      value: formatCurrency(totalSpend),
      icon: <FiDollarSign className="w-5 h-5" />,
      bg: 'bg-stat-green',
      iconColor: 'text-emerald-600 bg-emerald-100',
      accent: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    },
    {
      label: 'Pending Approvals',
      value: String(pendingApprovals),
      icon: <FiClock className="w-5 h-5" />,
      bg: 'bg-stat-amber',
      iconColor: 'text-amber-600 bg-amber-100',
      accent: 'bg-gradient-to-r from-amber-400 to-amber-600',
    },
    {
      label: 'Organization',
      value: company?.name ?? '—',
      icon: <FiPackage className="w-5 h-5" />,
      bg: 'bg-stat-purple',
      iconColor: 'text-violet-600 bg-violet-100',
      accent: 'bg-gradient-to-r from-violet-400 to-violet-600',
      small: true,
    },
  ]

  const QUICK_ACTIONS = [
    { href: '/products', label: 'Browse Catalog', icon: <FiShoppingCart className="w-4 h-4" />, show: true },
    { href: '/cart', label: 'View My Cart', icon: <FiPackage className="w-4 h-4" />, show: true },
    { href: '/orders', label: 'Reorder Previous', icon: <FiRepeat className="w-4 h-4" />, show: true },
    {
      href: '/approvals',
      label: `Review Approvals${pendingApprovals > 0 ? ` (${pendingApprovals})` : ''}`,
      icon: <FiCheckSquare className="w-4 h-4" />,
      show: session.role === 'MANAGER' || session.role === 'ADMIN',
      highlight: pendingApprovals > 0,
    },
    {
      href: '/admin',
      label: 'Admin Dashboard',
      icon: <FiSettings className="w-4 h-4" />,
      show: session.role === 'ADMIN',
    },
  ].filter((a) => a.show)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
            Good day, {firstName} 👋
          </h1>
          <p className="text-secondary-500 mt-1 text-sm">
            {company?.name ?? 'Your organisation'} &middot; {roleLabel(session.role)}
            {company?.verified && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Verified NGO
              </span>
            )}
          </p>
        </div>
        <Link href="/products">
          <Button size="sm">
            <FiPlus /> New order
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className={`relative rounded-2xl ${s.bg} border border-secondary-100 p-5 overflow-hidden`}>
            <div className={`stat-card-accent ${s.accent}`} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <div className="text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                  {s.label}
                </div>
                <div className={s.small
                  ? 'text-sm font-semibold text-secondary-800 mt-1.5 leading-snug'
                  : 'text-2xl font-extrabold text-secondary-900 mt-1.5 tabular-nums'
                }>
                  {s.value}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl ${s.iconColor} flex items-center justify-center flex-shrink-0`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link
                href="/orders"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 transition-colors"
              >
                View all <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                  <FiShoppingBag className="w-6 h-6 text-secondary-400" />
                </div>
                <p className="text-secondary-500 text-sm font-medium mb-4">No orders yet</p>
                <Link href="/products">
                  <Button size="sm">
                    <FiPlus /> Browse catalog
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-50">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-3.5 flex items-center justify-between gap-4 group">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-secondary-900 hover:text-primary-600 transition-colors text-sm"
                      >
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-secondary-400 mt-0.5">
                        {formatDate(order.createdAt)} &middot; {order.placedBy.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-secondary-900">
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

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="block">
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                  action.highlight
                    ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'border border-secondary-100 bg-white text-secondary-700 hover:bg-secondary-50 hover:border-secondary-200 hover:text-secondary-900'
                }`}>
                  <span className={`flex-shrink-0 ${action.highlight ? 'text-amber-600' : 'text-secondary-400'}`}>
                    {action.icon}
                  </span>
                  {action.label}
                  <FiArrowRight className="ml-auto w-3.5 h-3.5 opacity-40" />
                </button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="success">Paid</Badge>
  if (status === 'CANCELLED') return <Badge variant="danger">Cancelled</Badge>
  return <Badge variant="warning">Pending</Badge>
}

function roleLabel(role: string) {
  return role === 'STAFF' ? 'Staff' : role === 'MANAGER' ? 'Procurement Manager' : 'System Admin'
}
