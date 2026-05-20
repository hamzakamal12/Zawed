import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default async function AdminOrdersPage() {
  await requireRole(['ADMIN'])
  const orders = await prisma.order.findMany({
    include: { company: true, placedBy: true, items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">All orders</h1>
        <p className="text-secondary-500 mt-1">Global order log across every company.</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Placed by</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Status</th>
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
                  <td className="py-3 px-4">{o.company.name}</td>
                  <td className="py-3 px-4 text-secondary-600">{o.placedBy.name}</td>
                  <td className="py-3 px-4 text-secondary-600">{o.items.length}</td>
                  <td className="py-3 px-4 text-secondary-600">{formatDateTime(o.createdAt)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">
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
    PAID: 'success',
    PENDING_PAYMENT: 'warning',
    CANCELLED: 'danger',
  }
  return (
    <Badge variant={variants[status] ?? 'default'}>
      {status === 'PENDING_PAYMENT' ? 'Pending' : status === 'PAID' ? 'Paid' : status}
    </Badge>
  )
}
