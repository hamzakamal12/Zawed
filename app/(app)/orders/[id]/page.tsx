import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { FiDownload, FiCheckCircle } from 'react-icons/fi'
import OrderActions from './OrderActions'

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { placed?: string }
}) {
  const session = await requireSession()
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, placedBy: true, company: true },
  })
  if (!order) notFound()
  if (order.companyId !== session.companyId && session.role !== 'ADMIN') notFound()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {searchParams.placed && (
        <div className="rounded-md bg-green-50 border border-green-200 text-green-800 p-4 flex items-start gap-3">
          <FiCheckCircle className="mt-0.5 text-xl flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Order placed!</div>
            <p className="text-sm mt-1">
              Order <strong>{order.orderNumber}</strong> is confirmed.
              Payment method: <strong>Cash on Delivery</strong>. Download your
              tax invoice using the button on the right.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <Link href="/orders" className="text-sm text-primary-600 hover:underline">
            ← All orders
          </Link>
          <h1 className="text-3xl font-bold text-secondary-900 mt-1">
            Order {order.orderNumber}
          </h1>
          <p className="text-secondary-500 mt-1">
            Placed {formatDateTime(order.createdAt)} by {order.placedBy.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <FiDownload /> Download invoice (PDF)
            </Button>
          </a>
          {session.role === 'ADMIN' && order.status === 'PENDING_PAYMENT' && (
            <OrderActions orderId={order.id} />
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                  <th className="py-2 px-5">Product</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Unit</th>
                  <th className="py-2 px-3 text-right">Tax</th>
                  <th className="py-2 px-5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-secondary-50 last:border-0">
                    <td className="py-3 px-5">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-secondary-500">SKU {item.productSku}</div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatCurrency(Number(item.unitPrice))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {(Number(item.taxRate) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums font-medium">
                      {formatCurrency(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow status={order.status} />
            <Row label="Payment" value="Cash on Delivery" />
            <hr className="border-secondary-100" />
            <Row label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
            <Row label="Tax" value={formatCurrency(Number(order.taxAmount))} />
            <div className="border-t border-secondary-100 pt-3 flex items-center justify-between">
              <span className="font-semibold">Total due</span>
              <span className="font-bold text-lg">
                {formatCurrency(Number(order.totalAmount))}
              </span>
            </div>
            <hr className="border-secondary-100" />
            <div className="text-xs">
              <div className="font-semibold text-secondary-700 mb-1">Bill to</div>
              <div>{order.company.name}</div>
              {order.company.address && <div className="text-secondary-500">{order.company.address}</div>}
              {order.company.taxId && (
                <div className="text-secondary-500">Tax ID: {order.company.taxId}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function StatusRow({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PAID: 'success',
    PENDING_PAYMENT: 'warning',
    CANCELLED: 'danger',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-600">Status</span>
      <Badge variant={variants[status] ?? 'default'}>
        {status === 'PENDING_PAYMENT' ? 'Pending payment' : status === 'PAID' ? 'Paid' : status}
      </Badge>
    </div>
  )
}
