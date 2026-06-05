import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { getMessages } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { FiDownload, FiCheckCircle, FiFileText } from 'react-icons/fi'
import OrderActions from './OrderActions'

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { placed?: string }
}) {
  const session = await requireSession()
  const m = getMessages()
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, placedBy: true, company: true },
  })
  if (!order) notFound()
  if (order.companyId !== session.companyId && session.role !== 'ADMIN') notFound()

  const isPending = order.status === 'PENDING_PAYMENT'
  const isPaid = order.status === 'PAID'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {searchParams.placed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 flex items-start gap-3">
          <FiCheckCircle className="mt-0.5 text-xl flex-shrink-0 text-emerald-500" />
          <div className="flex-1">
            <div className="font-semibold">تم إرسال الطلب! / Order placed!</div>
            <p className="text-sm mt-1">
              طلبك <strong>{order.orderNumber}</strong> قيد المراجعة. حمّل الفاتورة المبدئية أدناه.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/orders" className="text-sm text-primary-600 hover:underline">
            ← جميع الطلبات
          </Link>
          <h1 className="text-2xl font-bold text-secondary-900 mt-1">
            {order.orderNumber}
          </h1>
          <p className="text-secondary-500 mt-1 text-sm">
            {formatDateTime(order.createdAt)} · {order.placedBy.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Proforma always available */}
          <a href={`/api/orders/${order.id}/invoice?type=proforma`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <FiFileText className="w-4 h-4" />
              الفاتورة المبدئية (Proforma)
            </Button>
          </a>
          {/* Tax invoice only when paid */}
          {isPaid && (
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <FiDownload className="w-4 h-4" />
                الفاتورة الضريبية (Tax Invoice)
              </Button>
            </a>
          )}
          {session.role === 'ADMIN' && isPending && (
            <OrderActions orderId={order.id} />
          )}
        </div>
      </div>

      {/* Status notice */}
      {isPending && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <strong>بانتظار تأكيد الدفع</strong> — الفاتورة الضريبية النهائية ستكون متاحة بعد تأكيد الدفع من الإدارة.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>المنتجات / Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                  <th className="py-2 px-5">المنتج</th>
                  <th className="py-2 px-3 text-right">الكمية</th>
                  <th className="py-2 px-3 text-right">السعر</th>
                  <th className="py-2 px-3 text-right">الضريبة</th>
                  <th className="py-2 px-5 text-right">الإجمالي</th>
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
            <CardTitle>الملخص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow status={order.status} />
            <Row label="طريقة الدفع" value="عند الاستلام (COD)" />
            <hr className="border-secondary-100" />
            <Row label="المجموع قبل الضريبة" value={formatCurrency(Number(order.subtotal))} />
            <Row label="الضريبة" value={formatCurrency(Number(order.taxAmount))} />
            <div className="border-t border-secondary-100 pt-3 flex items-center justify-between">
              <span className="font-semibold">الإجمالي المستحق</span>
              <span className="font-bold text-lg">
                {formatCurrency(Number(order.totalAmount))}
              </span>
            </div>
            <hr className="border-secondary-100" />
            <div className="text-xs">
              <div className="font-semibold text-secondary-700 mb-1">فاتورة إلى</div>
              <div>{order.company.name}</div>
              {order.company.address && <div className="text-secondary-500">{order.company.address}</div>}
              {order.company.taxId && (
                <div className="text-secondary-500">الرقم الضريبي: {order.company.taxId}</div>
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
  const labels: Record<string, string> = {
    PAID: 'مدفوع',
    PENDING_PAYMENT: 'بانتظار الدفع',
    CANCELLED: 'ملغى',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-600">الحالة</span>
      <Badge variant={variants[status] ?? 'default'}>{labels[status] ?? status}</Badge>
    </div>
  )
}
