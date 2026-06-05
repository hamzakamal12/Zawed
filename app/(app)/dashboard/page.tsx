import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { getMessages } from '@/lib/i18n'
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
  FiTrendingUp,
  FiFileText,
} from 'react-icons/fi'

export default async function DashboardPage() {
  const session = await requireSession()
  const m = getMessages()

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOf6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [stats, recentOrders, pendingApprovals, company, monthlyOrders] = await Promise.all([
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
    prisma.order.findMany({
      where: {
        companyId: session.companyId ?? '',
        createdAt: { gte: startOf6MonthsAgo },
        status: { in: ['PENDING_PAYMENT', 'PAID'] },
      },
      select: { totalAmount: true, createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalSpend = stats._sum.totalAmount ? Number(stats._sum.totalAmount) : 0
  const firstName = session.name.split(' ')[0]

  // Build monthly consumption for last 6 months
  const monthlyMap: Record<string, { label: string; total: number; count: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
    monthlyMap[key] = { label, total: 0, count: 0 }
  }
  for (const o of monthlyOrders) {
    const d = o.createdAt
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) {
      monthlyMap[key].total += Number(o.totalAmount)
      monthlyMap[key].count++
    }
  }
  const monthlyData = Object.values(monthlyMap)
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthTotal = monthlyMap[thisMonthKey]?.total ?? 0
  const lastMonthKey = `${startOfLastMonth.getFullYear()}-${String(startOfLastMonth.getMonth() + 1).padStart(2, '0')}`
  const lastMonthTotal = monthlyMap[lastMonthKey]?.total ?? 0
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1)

  const STATS = [
    {
      label: m.dashboard.totalOrders,
      value: String(stats._count),
      icon: <FiShoppingBag className="w-5 h-5" />,
      bg: 'bg-stat-blue',
      iconColor: 'text-blue-600 bg-blue-100',
      accent: 'bg-gradient-to-r from-blue-400 to-blue-600',
    },
    {
      label: m.dashboard.totalSpend,
      value: formatCurrency(totalSpend),
      icon: <FiDollarSign className="w-5 h-5" />,
      bg: 'bg-stat-green',
      iconColor: 'text-emerald-600 bg-emerald-100',
      accent: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    },
    {
      label: 'هذا الشهر',
      value: formatCurrency(thisMonthTotal),
      icon: <FiTrendingUp className="w-5 h-5" />,
      bg: 'bg-stat-amber',
      iconColor: 'text-amber-600 bg-amber-100',
      accent: 'bg-gradient-to-r from-amber-400 to-amber-600',
    },
    {
      label: m.dashboard.organization,
      value: company?.name ?? '—',
      icon: <FiPackage className="w-5 h-5" />,
      bg: 'bg-stat-purple',
      iconColor: 'text-violet-600 bg-violet-100',
      accent: 'bg-gradient-to-r from-violet-400 to-violet-600',
      small: true,
    },
  ]

  const QUICK_ACTIONS = [
    { href: '/products', label: m.dashboard.browseCatalogBtn, icon: <FiShoppingCart className="w-4 h-4" />, show: true },
    { href: '/cart', label: m.dashboard.viewCartBtn, icon: <FiPackage className="w-4 h-4" />, show: true },
    { href: '/orders', label: m.dashboard.reorderBtn, icon: <FiRepeat className="w-4 h-4" />, show: true },
    {
      href: '/approvals',
      label: `${m.dashboard.reviewApprovalsBtn}${pendingApprovals > 0 ? ` (${pendingApprovals})` : ''}`,
      icon: <FiCheckSquare className="w-4 h-4" />,
      show: session.role === 'MANAGER' || session.role === 'ADMIN',
      highlight: pendingApprovals > 0,
    },
    {
      href: '/admin',
      label: m.dashboard.adminDashboardBtn,
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
            {m.dashboard.greet}, {firstName} 👋
          </h1>
          <p className="text-secondary-500 mt-1 text-sm">
            {company?.name ?? 'مؤسستك'} · {roleLabel(session.role, m)}
            {company?.verified && (
              <span className="ms-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {m.dashboard.verifiedNgo}
              </span>
            )}
          </p>
        </div>
        <Link href="/products">
          <Button size="sm">
            <FiPlus /> {m.dashboard.newOrder}
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
              <CardTitle>{m.dashboard.recentOrders}</CardTitle>
              <Link
                href="/orders"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 transition-colors"
              >
                {m.dashboard.viewAll} <FiArrowRight className="w-3 h-3 rtl:rotate-180" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                  <FiShoppingBag className="w-6 h-6 text-secondary-400" />
                </div>
                <p className="text-secondary-500 text-sm font-medium mb-4">{m.dashboard.noOrdersYet}</p>
                <Link href="/products">
                  <Button size="sm"><FiPlus /> {m.dashboard.browseCatalog}</Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-50">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-secondary-900 hover:text-primary-600 transition-colors text-sm"
                      >
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-secondary-400 mt-0.5">
                        {formatDate(order.createdAt)} · {order.placedBy.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {order.status === 'PENDING_PAYMENT' && (
                        <a href={`/api/orders/${order.id}/invoice?type=proforma`} target="_blank" rel="noreferrer"
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium">
                          <FiFileText className="w-3 h-3" /> مبدئية
                        </a>
                      )}
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
            <CardTitle>{m.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="block">
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-start cursor-pointer ${
                  action.highlight
                    ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'border border-secondary-100 bg-white text-secondary-700 hover:bg-secondary-50 hover:border-secondary-200'
                }`}>
                  <span className={`flex-shrink-0 ${action.highlight ? 'text-amber-600' : 'text-secondary-400'}`}>
                    {action.icon}
                  </span>
                  {action.label}
                  <FiArrowRight className="ms-auto w-3.5 h-3.5 opacity-40 rtl:rotate-180" />
                </button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Consumption */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <span className="flex items-center gap-2">
                <FiTrendingUp className="text-primary-500" />
                الاستهلاك الشهري
              </span>
            </CardTitle>
            <div className="text-xs text-secondary-500">آخر 6 أشهر</div>
          </div>
        </CardHeader>
        <CardContent>
          {/* This month highlight */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
              <div className="text-xs text-primary-600 font-semibold mb-1">هذا الشهر</div>
              <div className="text-2xl font-extrabold text-primary-700 tabular-nums">
                {formatCurrency(thisMonthTotal)}
              </div>
            </div>
            <div className="rounded-xl bg-secondary-50 border border-secondary-100 p-4">
              <div className="text-xs text-secondary-500 font-semibold mb-1">الشهر الماضي</div>
              <div className="text-2xl font-extrabold text-secondary-700 tabular-nums">
                {formatCurrency(lastMonthTotal)}
              </div>
              {lastMonthTotal > 0 && thisMonthTotal > 0 && (
                <div className={`text-xs mt-1 font-medium ${thisMonthTotal >= lastMonthTotal ? 'text-emerald-600' : 'text-red-500'}`}>
                  {thisMonthTotal >= lastMonthTotal ? '↑' : '↓'}{' '}
                  {Math.abs(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0)}%
                  {' '}{thisMonthTotal >= lastMonthTotal ? 'زيادة' : 'انخفاض'}
                </div>
              )}
            </div>
          </div>

          {/* Bar chart */}
          <div className="space-y-3">
            {monthlyData.map((month) => (
              <div key={month.label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-secondary-500 text-right shrink-0">{month.label}</div>
                <div className="flex-1 h-7 bg-secondary-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-brand-blue rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: month.total > 0 ? `${(month.total / maxMonthly) * 100}%` : '0%', minWidth: month.total > 0 ? '2rem' : '0' }}
                  >
                    {month.total > 0 && (
                      <span className="text-white text-[10px] font-semibold">
                        {formatCurrency(month.total)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-6 text-center">
                  <span className="text-xs text-secondary-400">{month.count > 0 ? month.count : ''}</span>
                </div>
              </div>
            ))}
          </div>
          {monthlyData.every(m => m.total === 0) && (
            <div className="text-center py-6 text-secondary-400 text-sm">لا توجد طلبات في الأشهر الستة الماضية</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="success">مدفوع</Badge>
  if (status === 'CANCELLED') return <Badge variant="danger">ملغى</Badge>
  return <Badge variant="warning">بانتظار الدفع</Badge>
}

import type { Messages } from '@/lib/i18n'
function roleLabel(role: string, m: Messages) {
  return role === 'STAFF' ? m.dashboard.staff : role === 'MANAGER' ? m.dashboard.manager : m.dashboard.sysAdmin
}
