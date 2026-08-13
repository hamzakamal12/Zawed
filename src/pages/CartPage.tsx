import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Info } from 'lucide-react'
import { useCart } from '@/context/CartProvider'
import { useCatalogPrices, useInventory, useProducts } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatSDG } from '@/lib/format'
import { Badge, Button, Card, CardBody, EmptyState, QtyStepper, Skeleton } from '@/components/ui'

export default function CartPage() {
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const { lines, setQty, remove } = useCart()

  const products = useProducts()
  const prices = useCatalogPrices()
  const inventory = useInventory()

  const rows = useMemo(() => {
    return lines.map((line) => {
      const product = products.data?.find((p) => p.id === line.productId)
      const stock = inventory.data?.find((i) => i.product_id === line.productId)
      const available = Math.max((stock?.qty_on_hand ?? 0) - (stock?.qty_reserved ?? 0), 0)
      // List price (qty 1). The authoritative, tier-adjusted price is applied
      // server-side by place_order — this is an estimate for the summary.
      const unit = prices.data?.[line.productId]?.unit_price_sdg ?? null
      return { line, product, unit, available }
    })
  }, [lines, products.data, prices.data, inventory.data])

  const subtotal = rows.reduce(
    (sum, r) => sum + (r.unit != null ? r.unit * r.line.qty : 0),
    0,
  )

  const hasBlocker = rows.some(
    (r) => !r.product || r.line.qty > r.available || r.line.qty < (r.product?.min_order_qty ?? 1),
  )

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={44} />}
        title={t('cart_empty')}
        action={
          <Link to="/catalog">
            <Button>{t('browse_catalog')}</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('cart_title')}</h1>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rows.map(({ line, product, unit, available }) => {
            const belowMin = product ? line.qty < product.min_order_qty : false
            const overStock = line.qty > available
            return (
              <Card key={line.productId}>
                <CardBody className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {product ? (
                      <>
                        <Link
                          to={`/catalog/${product.id}`}
                          className="font-bold text-ink hover:text-primary-700"
                        >
                          {pick(product.name_ar, product.name_en)}
                        </Link>
                        <div className="mt-0.5 font-mono text-[11px] text-muted">{product.sku}</div>
                      </>
                    ) : (
                      <Skeleton className="h-5 w-40" />
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {unit != null && (
                        <span className="text-sm text-muted">
                          {formatSDG(unit)} · {t('per_unit')}
                        </span>
                      )}
                      {belowMin && product && (
                        <Badge tone="warning">
                          {t('min_order_warning', { qty: product.min_order_qty })}
                        </Badge>
                      )}
                      {overStock && <Badge tone="danger">{t('out_of_stock')}</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <QtyStepper
                      value={line.qty}
                      onChange={(next) => setQty(line.productId, next)}
                      min={1}
                    />
                    <div className="font-extrabold text-ink">
                      {unit != null ? formatSDG(unit * line.qty) : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.productId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-status-critical hover:brightness-90"
                    >
                      <Trash2 size={13} />
                      {t('remove')}
                    </button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t('subtotal')}</span>
                <span className="font-semibold tabular-nums">{formatSDG(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="font-bold text-ink">{t('total')}</span>
                <span className="text-lg font-extrabold text-primary-700">
                  {formatSDG(subtotal)}
                </span>
              </div>

              <p className="flex items-start gap-1.5 rounded-lg bg-primary-50 p-2.5 text-[11px] leading-relaxed text-primary-800">
                <Info size={14} className="mt-px shrink-0" />
                {t('price_note')}
              </p>

              <Button
                size="lg"
                className="w-full"
                disabled={hasBlocker}
                onClick={() => navigate('/checkout')}
              >
                {t('checkout')}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
