import { Link } from 'react-router-dom'
import { AlertTriangle, Coins, PackageX, ShoppingBag, Clock } from 'lucide-react'
import { useAdminOrders, useCurrentFx, useInventory, useProducts } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatNumber, formatSDG, hoursSince } from '@/lib/format'
import { Badge, Card, CardBody, CardTitle, Skeleton } from '@/components/ui'
import OrderStatusBadge from '@/components/OrderStatusBadge'

export default function AdminDashboard() {
  const { t, lang, pick } = useI18n()
  const fx = useCurrentFx()
  const orders = useAdminOrders('all')
  const inventory = useInventory()
  const products = useProducts()

  const today = new Date().toISOString().slice(0, 10)
  const rows = orders.data ?? []
  const todayCount = rows.filter((o) => o.created_at.slice(0, 10) === today).length
  const pendingCount = rows.filter((o) => o.status === 'pending_approval').length

  const lowStock = (inventory.data ?? []).filter(
    (i) => i.qty_on_hand - i.qty_reserved <= i.reorder_point,
  )

  const fxAge = hoursSince(fx.data?.effective_from)
  const fxStale = fxAge != null && fxAge > 24

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('admin_title')}</h1>

      {fxStale && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          <AlertTriangle size={18} className="mt-px shrink-0" />
          <div className="flex-1">
            {t('fx_stale_warning')}
            <Link to="/admin/fx" className="ms-2 underline">
              {t('fx_title')}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<ShoppingBag size={18} />}
          label={t('today_orders')}
          value={orders.isLoading ? null : formatNumber(todayCount)}
        />
        <Stat
          icon={<Clock size={18} />}
          label={t('pending_orders')}
          value={orders.isLoading ? null : formatNumber(pendingCount)}
          tone={pendingCount > 0 ? 'warning' : undefined}
        />
        <Stat
          icon={<PackageX size={18} />}
          label={t('low_stock_items')}
          value={inventory.isLoading ? null : formatNumber(lowStock.length)}
          tone={lowStock.length > 0 ? 'danger' : undefined}
        />
        <Stat
          icon={<Coins size={18} />}
          label={t('current_fx')}
          value={fx.isLoading ? null : `${formatNumber(fx.data?.rate_sdg_per_usd ?? null)} ج.س`}
          hint={fxAge != null ? t('fx_updated_ago', { h: Math.floor(fxAge) }) : undefined}
          tone={fxStale ? 'warning' : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>{t('admin_orders_title')}</CardTitle>
              <Link to="/admin/orders" className="text-sm font-semibold text-primary-700 hover:underline">
                {t('nav_admin_orders')} →
              </Link>
            </div>
            {orders.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">{t('no_orders')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {rows.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-mono text-sm font-bold text-ink hover:text-primary-700"
                      >
                        {o.order_number}
                      </Link>
                      <div className="truncate text-[11px] text-muted">
                        {o.companies ? pick(o.companies.name_ar, o.companies.name_en) : '—'} ·{' '}
                        {formatDate(o.created_at, lang)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatSDG(o.total)}
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('low_stock_items')}</CardTitle>
            {inventory.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">✓</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.slice(0, 8).map((i) => {
                  const product = products.data?.find((p) => p.id === i.product_id)
                  const available = i.qty_on_hand - i.qty_reserved
                  return (
                    <li key={i.product_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {product ? pick(product.name_ar, product.name_en) : i.product_id}
                        </div>
                        <div className="font-mono text-[11px] text-muted">{product?.sku}</div>
                      </div>
                      <Badge tone={available <= 0 ? 'danger' : 'warning'}>
                        {formatNumber(available)} / {formatNumber(i.reorder_point)}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  hint?: string
  tone?: 'warning' | 'danger'
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-1.5 text-muted">
          {icon}
          <span className="text-[11px] font-semibold leading-tight">{label}</span>
        </div>
        {value === null ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <div
            className={
              tone === 'danger'
                ? 'mt-1 text-xl font-extrabold text-red-600'
                : tone === 'warning'
                  ? 'mt-1 text-xl font-extrabold text-amber-600'
                  : 'mt-1 text-xl font-extrabold text-ink'
            }
          >
            {value}
          </div>
        )}
        {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
      </CardBody>
    </Card>
  )
}
