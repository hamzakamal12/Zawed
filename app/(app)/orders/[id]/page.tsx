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
    include: { items: true, placedBy: true },
  })
  if (!order) notFound()
  if (order.placedById !== session.sub && session.role !== 'ADMIN') notFound()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {searchParams.placed && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 p-4 flex items-start gap-3">
          <FiCheckCircle className="mt-0.5 text-xl flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">تم استلام طلبك! 🎉</div>
            <p className="text-sm mt-1">
              طلبك رقم <strong>{order.orderNumber}</strong> قيد المعالجة. سنتواصل معك على{' '}
              <strong>{order.customerPhone}</strong> لتأكيد التوصيل. الدفع{' '}
              <strong>عند الاستلام</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm text-primary-600 hover:underline">
            → كل الطلبات
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 mt-1">
            طلب {order.orderNumber}
          </h1>
          <p className="text-secondary-500 mt-1 text-sm">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <FiDownload /> تحميل الفاتورة
            </Button>
          </a>
        </div>
      </div>

      {session.role === 'ADMIN' && <OrderActions orderId={order.id} status={order.status} />}

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>المنتجات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-secondary-100">
              {order.items.map((item) => (
                <li key={item.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-secondary-500">
                      {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrency(Number(item.subtotal))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الملخّص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow status={order.status} />
            <Row label="الدفع" value="عند الاستلام" />
            <hr className="border-secondary-100" />
            <Row label="المجموع الفرعي" value={formatCurrency(Number(order.subtotal))} />
            {Number(order.taxAmount) > 0 && (
              <Row label="الضريبة" value={formatCurrency(Number(order.taxAmount))} />
            )}
            <Row label="التوصيل" value={Number(order.deliveryFee) === 0 ? 'مجاني' : formatCurrency(Number(order.deliveryFee))} />
            <div className="border-t border-secondary-100 pt-3 flex items-center justify-between">
              <span className="font-semibold">الإجمالي</span>
              <span className="font-bold text-lg">{formatCurrency(Number(order.totalAmount))}</span>
            </div>
            <hr className="border-secondary-100" />
            <div className="text-xs">
              <div className="font-semibold text-secondary-700 mb-1">التوصيل إلى</div>
              <div>{order.customerName}</div>
              <div className="text-secondary-500">{order.customerPhone}</div>
              <div className="text-secondary-500">
                {order.shippingCity} — {order.shippingAddress}
              </div>
            </div>
            {order.notes && (
              <div className="text-xs">
                <div className="font-semibold text-secondary-700 mb-1">ملاحظات</div>
                <div className="text-secondary-500">{order.notes}</div>
              </div>
            )}
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
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-600">الحالة</span>
      <Badge variant={variants[status] ?? 'default'}>{labels[status] ?? status}</Badge>
    </div>
  )
}
