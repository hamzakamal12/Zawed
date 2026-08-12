import { Link } from 'react-router-dom'
import { ClipboardList, RotateCcw } from 'lucide-react'
import { useMyOrders } from '@/hooks/queries'
import { useCart } from '@/context/CartProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatSDG } from '@/lib/format'
import { Button, Card, CardBody, EmptyState, Skeleton } from '@/components/ui'
import OrderStatusBadge from '@/components/OrderStatusBadge'
import type { OrderWithItems } from '@/hooks/queries'

export default function OrdersPage() {
  const { t, lang } = useI18n()
  const orders = useMyOrders()
  const { add, clear } = useCart()

  const reorder = (order: OrderWithItems) => {
    clear()
    for (const item of order.order_items) add(item.product_id, item.qty)
  }

  if (orders.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  const rows = orders.data ?? []

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('orders_title')}</h1>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={44} />}
          title={t('no_orders')}
          action={
            <Link to="/catalog">
              <Button>{t('browse_catalog')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((order) => (
            <Card key={order.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-mono font-bold text-ink hover:text-primary-700"
                  >
                    {order.order_number}
                  </Link>
                  <div className="mt-1 text-xs text-muted">
                    {formatDate(order.created_at, lang)} · {order.order_items.length}{' '}
                    {t('items_count')}
                    {order.po_number && <> · PO {order.po_number}</>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-extrabold tabular-nums text-ink">
                    {formatSDG(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <Link to="/cart" onClick={() => reorder(order)}>
                    <Button variant="outline" size="sm">
                      <RotateCcw size={14} />
                      <span className="hidden sm:inline">{t('reorder')}</span>
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
