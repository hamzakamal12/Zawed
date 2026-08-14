import { Link } from 'react-router-dom'
import { Coins, PackageX, ShoppingBag, Clock } from 'lucide-react'
import { useAdminOrders, useCurrentFx, useFxStatus, useInventory, useProducts } from '@/hooks/queries'
import FxAgeNotice from '@/components/FxAgeNotice'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatNumber, formatSDG, hoursSince } from '@/lib/format'
import { Badge, Card, CardBody, CardTitle, Skeleton, StatTile } from '@/components/ui'
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
  const fxStatus = useFxStatus()
  const fxStale = fxStatus.data?.is_stale ?? false

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('admin_title')}</h1>

      {/* Age, thresholds and verdict all come from the server, which is also
          what enforces them — a locally computed "stale after 24h" could show
          reassuring green for a rate the server is already refusing. */}
      <FxAgeNotice />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<ShoppingBag size={18} />}
          label={t('today_orders')}
          value={formatNumber(todayCount)}
          loading={orders.isLoading}
        />
        <StatTile
          icon={<Clock size={18} />}
          label={t('pending_orders')}
          value={formatNumber(pendingCount)}
          loading={orders.isLoading}
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={<PackageX size={18} />}
          label={t('low_stock_items')}
          value={formatNumber(lowStock.length)}
          loading={inventory.isLoading}
          tone={lowStock.length > 0 ? 'critical' : 'default'}
        />
        <StatTile
          icon={<Coins size={18} />}
          label={t('current_fx')}
          value={`${formatNumber(fx.data?.rate_sdg_per_usd ?? null)} ج.س`}
          hint={fxAge != null ? t('fx_updated_ago', { h: Math.floor(fxAge) }) : undefined}
          loading={fx.isLoading}
          tone={fxStale ? 'warning' : 'brand'}
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
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-mono text-sm font-bold text-ink hover:text-primary-700"
                      >
                        {o.order_number}
                      </Link>
                      <div className="truncate text-[11px] text-muted">
                        {/* dir=auto isolates the name: a company with only an
                            Arabic name sits inside an English line otherwise,
                            and bidi splits the date around it ("13 …‎ Aug 2026"). */}
                        <span dir="auto">
                          {o.companies ? pick(o.companies.name_ar, o.companies.name_en) : '—'}
                        </span>{' '}
                        · {formatDate(o.created_at, lang)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
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
              <p className="py-8 text-center text-sm text-muted">{t('no_low_stock')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.slice(0, 8).map((i) => {
                  const product = products.data?.find((p) => p.id === i.product_id)
                  const available = i.qty_on_hand - i.qty_reserved
                  return (
                    <li key={i.product_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">
                          {product ? pick(product.name_ar, product.name_en) : i.product_id}
                        </div>
                        <div className="font-mono text-[11px] text-muted">{product?.sku}</div>
                      </div>
                      {/* dir=ltr is load-bearing: in an RTL paragraph the bidi
                          algorithm treats the slash between two numbers as RTL
                          and swaps them, so "0 / 20" renders as "20 / 0" — i.e.
                          the dashboard reports stock backwards. */}
                      <Badge tone={available <= 0 ? 'danger' : 'warning'}>
                        <span dir="ltr">
                          {formatNumber(available)} / {formatNumber(i.reorder_point)}
                        </span>
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

