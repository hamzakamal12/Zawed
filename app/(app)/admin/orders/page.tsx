import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default async function AdminOrdersPage() {
  await requireRole(['ADMIN'])
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">كل الطلبات</h1>
        <p className="text-secondary-500 mt-1">سجل جميع طلبات المتجر.</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">المدينة</th>
                <th className="py-3 px-4">المنتجات</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-secondary-50">
                  <td className="py-3 px-4">
                    <Link href={`/orders/${o.id}`} className="font-medium hover:text-primary-600">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div>{o.customerName}</div>
                    <div className="text-xs text-secondary-400">{o.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4 text-secondary-600">{o.shippingCity}</td>
                  <td className="py-3 px-4 text-secondary-600">{o.items.length}</td>
                  <td className="py-3 px-4 text-secondary-600 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  <td className="py-3 px-4 tabular-nums font-medium whitespace-nowrap">
                    {formatCurrency(Number(o.totalAmount))}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    DELIVERED: 'success',
    CONFIRMED: 'info',
    PENDING_PAYMENT: 'warning',
    CANCELLED: 'danger',
  }
  const labels: Record<string, string> = {
    DELIVERED: 'تم التوصيل',
    CONFIRMED: 'قيد التوصيل',
    PENDING_PAYMENT: 'قيد المعالجة',
    CANCELLED: 'ملغي',
  }
  return <Badge variant={variants[status] ?? 'default'}>{labels[status] ?? status}</Badge>
}
