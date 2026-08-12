import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatSDG } from '@/lib/format'
import { Card, CardBody, EmptyState, Select, Skeleton } from '@/components/ui'
import OrderStatusBadge, { ORDER_STATUSES, useStatusLabel } from '@/components/OrderStatusBadge'
import type { OrderStatus } from '@/lib/database.types'

export default function AdminOrdersPage() {
  const { t, lang, pick } = useI18n()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const orders = useAdminOrders(filter)
  const update = useUpdateOrderStatus()
  const statusLabel = useStatusLabel()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">{t('admin_orders_title')}</h1>
        <Select
          className="w-auto min-w-[180px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
        >
          <option value="all">{t('all_statuses')}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>

      {orders.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (orders.data ?? []).length === 0 ? (
        <EmptyState title={t('no_orders')} />
      ) : (
        <div className="space-y-3">
          {(orders.data ?? []).map((o) => (
            <Card key={o.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={`/orders/${o.id}`}
                    className="font-mono font-bold text-ink hover:text-primary-700"
                  >
                    {o.order_number}
                  </Link>
                  <div className="mt-1 text-xs text-muted">
                    {o.companies ? pick(o.companies.name_ar, o.companies.name_en) : '—'} ·{' '}
                    {formatDate(o.created_at, lang)} · {o.order_items.length} {t('items_count')}
                    {o.po_number && <> · PO {o.po_number}</>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-extrabold tabular-nums text-ink">
                    {formatSDG(o.total)}
                  </span>
                  <OrderStatusBadge status={o.status} />
                  <Select
                    aria-label={t('change_status')}
                    className="h-9 w-auto min-w-[150px] text-xs"
                    value={o.status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate({ orderId: o.id, status: e.target.value as OrderStatus })
                    }
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
