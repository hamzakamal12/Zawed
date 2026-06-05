import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import AdminOrderActions from './AdminOrderActions'

export default async function AdminOrdersPage() {
  await requireRole(['ADMIN'])

  const [orders, pendingCount, paidCount, totalRevenue] = await Promise.all([
    prisma.order.findMany({
      include: { company: true, placedBy: true, items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
  ])

  const revenue = Number(totalRevenue._sum.totalAmount ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">جميع الطلبات</h1>
        <p className="text-secondary-500 mt-1 text-sm">سجل كامل لطلبات جميع المؤسسات</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">بانتظار الدفع</div>
          <div className="text-3xl font-extrabold text-amber-700 mt-1">{pendingCount}</div>
          <div className="text-xs text-amber-500 mt-0.5">طلب يحتاج تأكيداً</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">مؤكدة ومدفوعة</div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-1">{paidCount}</div>
          <div className="text-xs text-emerald-500 mt-0.5">طلب مكتمل</div>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="text-xs text-primary-600 font-semibold uppercase tracking-wide">إجمالي الإيرادات</div>
          <div className="text-2xl font-extrabold text-primary-700 mt-1">{formatCurrency(revenue)}</div>
          <div className="text-xs text-primary-500 mt-0.5">من الطلبات المدفوعة</div>
        </div>
      </div>

      {/* Pending orders first */}
      {pendingCount > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            طلبات بانتظار تأكيد الدفع ({pendingCount})
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <OrderTable orders={orders.filter(o => o.status === 'PENDING_PAYMENT')} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* All orders */}
      <div>
        <h2 className="text-sm font-semibold text-secondary-600 mb-3">جميع الطلبات ({orders.length})</h2>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <OrderTable orders={orders} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrderTable({ orders }: { orders: Awaited<ReturnType<typeof prisma.order.findMany<{ include: { company: true; placedBy: true; items: true } }>>> }) {
  if (orders.length === 0) {
    return <div className="py-10 text-center text-secondary-400 text-sm">لا توجد طلبات</div>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-right text-xs uppercase text-secondary-500 border-b border-secondary-100">
          <th className="py-3 px-4 text-left">رقم الطلب</th>
          <th className="py-3 px-4 text-left">المؤسسة</th>
          <th className="py-3 px-4 text-left">بواسطة</th>
          <th className="py-3 px-4 text-center">المنتجات</th>
          <th className="py-3 px-4 text-left">التاريخ</th>
          <th className="py-3 px-4 text-right">الإجمالي</th>
          <th className="py-3 px-4 text-center">الحالة</th>
          <th className="py-3 px-4 text-left">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-b border-secondary-50 hover:bg-secondary-50/50 transition-colors">
            <td className="py-3 px-4">
              <Link href={`/orders/${o.id}`} className="font-medium hover:text-primary-600 transition-colors">
                {o.orderNumber}
              </Link>
            </td>
            <td className="py-3 px-4 font-medium text-secondary-800">{o.company.name}</td>
            <td className="py-3 px-4 text-secondary-500">{o.placedBy.name}</td>
            <td className="py-3 px-4 text-center text-secondary-500">{o.items.length}</td>
            <td className="py-3 px-4 text-secondary-500 text-xs">{formatDateTime(o.createdAt)}</td>
            <td className="py-3 px-4 text-right tabular-nums font-semibold">
              {formatCurrency(Number(o.totalAmount))}
            </td>
            <td className="py-3 px-4 text-center">
              <StatusBadge status={o.status} />
            </td>
            <td className="py-3 px-4">
              <AdminOrderActions
                orderId={o.id}
                orderNumber={o.orderNumber}
                status={o.status}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PAID: 'success',
    PENDING_PAYMENT: 'warning',
    CANCELLED: 'danger',
  }
  const labels: Record<string, string> = {
    PAID: 'مدفوع',
    PENDING_PAYMENT: 'بانتظار الدفع',
    CANCELLED: 'ملغى',
  }
  return (
    <Badge variant={variants[status] ?? 'default'}>{labels[status] ?? status}</Badge>
  )
}
