import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useOrder } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatDateTime, formatNumber, formatSDG } from '@/lib/format'
import { Card, CardBody, CardTitle, Skeleton } from '@/components/ui'
import OrderStatusBadge from '@/components/OrderStatusBadge'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, pick, lang, dir } = useI18n()
  const order = useOrder(id)
  const BackIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (!order.data) {
    return <div className="py-16 text-center text-muted">{t('no_orders')}</div>
  }

  const o = order.data

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
      >
        <BackIcon size={16} />
        {t('orders_title')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-extrabold text-ink">{o.order_number}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(o.created_at, lang)}</p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      <Card>
        <CardBody>
          <CardTitle className="mb-3">{t('order_details')}</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-start font-semibold">{t('product_details')}</th>
                  <th className="py-2 text-center font-semibold">{t('quantity')}</th>
                  <th className="py-2 text-end font-semibold">{t('unit_price')}</th>
                  <th className="py-2 text-end font-semibold">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {o.order_items.map((item) => (
                  <tr key={item.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3">
                      <div className="font-semibold text-ink">
                        {item.products
                          ? pick(item.products.name_ar, item.products.name_en)
                          : '—'}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {item.products?.sku}
                      </div>
                    </td>
                    <td className="py-3 text-center tabular-nums">{formatNumber(item.qty)}</td>
                    <td className="py-3 text-end tabular-nums">
                      {formatSDG(item.unit_price_snapshot)}
                    </td>
                    <td className="py-3 text-end font-semibold tabular-nums">
                      {formatSDG(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <Row label={t('subtotal')} value={formatSDG(o.subtotal)} />
            {Number(o.vat_amount) > 0 && <Row label={t('vat')} value={formatSDG(o.vat_amount)} />}
            <div className="flex items-center justify-between pt-1">
              <dt className="font-bold text-ink">{t('total')}</dt>
              <dd className="text-lg font-extrabold text-primary-700">{formatSDG(o.total)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle className="mb-3">{t('delivery_details')}</CardTitle>
          <dl className="space-y-2 text-sm">
            <Row label={t('delivery_address')} value={o.delivery_address ?? '—'} />
            <Row label={t('requested_date')} value={formatDate(o.requested_delivery_date, lang)} />
            <Row label={t('po_number')} value={o.po_number ?? '—'} />
            <Row
              label={t('fx_at_order')}
              value={o.fx_rate_snapshot ? `${formatNumber(o.fx_rate_snapshot)} ج.س / $1` : '—'}
            />
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-semibold text-ink">{value}</dd>
    </div>
  )
}
