import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { FiDownload } from 'react-icons/fi'
import ReorderButton from './ReorderButton'

export default async function OrdersListPage() {
  const session = await requireSession()
  const orders = await prisma.order.findMany({
    where: { companyId: session.companyId ?? undefined },
    include: { placedBy: true, items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Orders</h1>
        <p className="text-secondary-500 mt-1">All past orders for your company.</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-secondary-500">
            No orders placed yet.{' '}
            <Link href="/products" className="text-primary-600 hover:underline">
              Start shopping
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-secondary-500 border-b border-secondary-100">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Placed</th>
                  <th className="py-3 px-4">By</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-secondary-900 hover:text-primary-600"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-secondary-600">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-secondary-600">{order.placedBy.name}</td>
                    <td className="py-3 px-4 text-secondary-600">{order.items.length}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">
                      {formatCurrency(Number(order.totalAmount))}
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm">
                            <FiDownload /> Invoice
                          </Button>
                        </a>
                        {(session.role === 'MANAGER' || session.role === 'ADMIN') && (
                          <ReorderButton orderId={order.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PAID: 'success',
    PENDING_PAYMENT: 'warning',
    CANCELLED: 'danger',
  }
  return (
    <Badge variant={variants[status] ?? 'default'}>
      {status === 'PENDING_PAYMENT' ? 'Pending payment' : status === 'PAID' ? 'Paid' : status}
    </Badge>
  )
}
