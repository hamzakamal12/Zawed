import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { FiDownload } from 'react-icons/fi'
import ReorderButton from './ReorderButton'

export default async function OrdersListPage() {
  const session = await requireSession()
  const orders = await prisma.order.findMany({
    where: { placedById: session.sub },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">طلباتي</h1>
        <p className="text-secondary-500 mt-1">كل طلباتك السابقة وحالتها.</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-secondary-500">
            لا توجد طلبات بعد.{' '}
            <Link href="/products" className="text-primary-600 hover:underline">
              ابدئي التسوّق
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-semibold text-secondary-900 hover:text-primary-600"
                  >
                    {order.orderNumber}
                  </Link>
                  <div className="text-xs text-secondary-500 mt-0.5">
                    {formatDate(order.createdAt)} · {order.items.length} منتج
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm">
                      <FiDownload /> <span className="hidden sm:inline">الفاتورة</span>
                    </Button>
                  </a>
                  <ReorderButton orderId={order.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
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
