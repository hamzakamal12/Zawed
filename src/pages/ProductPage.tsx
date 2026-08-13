import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ArrowLeft, ShoppingCart, TrendingDown } from 'lucide-react'
import {
  useCatalogPrices,
  useInventory,
  usePriceForQty,
  useProductTiers,
  useProducts,
} from '@/hooks/queries'
import { useCart } from '@/context/CartProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatNumber, formatSDG } from '@/lib/format'
import { Badge, Button, Card, CardBody, CardTitle, QtyStepper, Skeleton } from '@/components/ui'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { t, pick, dir } = useI18n()
  const { add } = useCart()

  const products = useProducts()
  const product = products.data?.find((p) => p.id === id)

  const [qty, setQty] = useState(1)
  const livePrice = usePriceForQty(id, qty)
  const catalogPrices = useCatalogPrices()
  const tiers = useProductTiers(id)
  const inventory = useInventory()
  const [added, setAdded] = useState(false)

  const stock = inventory.data?.find((i) => i.product_id === id)
  const available = Math.max((stock?.qty_on_hand ?? 0) - (stock?.qty_reserved ?? 0), 0)

  if (products.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (!product) {
    return (
      <div className="py-16 text-center text-muted">
        <p>{t('no_results')}</p>
        <Link to="/catalog" className="mt-3 inline-block font-semibold text-primary-700">
          {t('back_to_catalog')}
        </Link>
      </div>
    )
  }

  const BackIcon = dir === 'rtl' ? ArrowLeft : ArrowRight
  const unitPrice = livePrice.data?.unit_price_sdg ?? catalogPrices.data?.[product.id]?.unit_price_sdg ?? null
  const discount = livePrice.data?.discount_applied ?? 0
  const lineTotal = unitPrice != null ? unitPrice * qty : null

  // The next tier the buyer hasn't reached yet — drives the upsell hint.
  const nextTier = (tiers.data ?? [])
    .filter((tier) => tier.min_qty > qty && Number(tier.discount_percent) > Number(discount))
    .sort((a, b) => a.min_qty - b.min_qty)[0]

  const onAdd = () => {
    add(product.id, qty)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
      >
        <BackIcon size={16} />
        {t('back_to_catalog')}
      </Link>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-xs text-muted">{product.sku}</span>
              <h1 className="mt-1 text-xl font-extrabold leading-snug text-ink">
                {pick(product.name_ar, product.name_en)}
              </h1>
            </div>
            {available <= 0 ? (
              <Badge tone="danger">{t('out_of_stock')}</Badge>
            ) : available <= (stock?.reorder_point ?? 0) ? (
              <Badge tone="warning">{t('low_stock')}</Badge>
            ) : (
              <Badge tone="success">{t('in_stock')}</Badge>
            )}
          </div>

          {product.description_ar && (
            <p className="mt-3 text-sm leading-relaxed text-muted">{product.description_ar}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Spec label={t('unit')} value={product.unit} />
            <Spec label={t('units_per_pack')} value={formatNumber(product.units_per_pack)} />
            <Spec label={t('min_order')} value={formatNumber(product.min_order_qty)} />
            <Spec label={t('lead_time')} value={`${product.lead_time_days} ${t('days')}`} />
          </dl>
        </CardBody>
      </Card>

      {/* Live price for the chosen quantity */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-muted">{t('unit_price')}</div>
              {livePrice.isLoading ? (
                <Skeleton className="mt-1 h-8 w-32" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-primary-700">
                    {formatSDG(unitPrice)}
                  </span>
                  {Number(discount) > 0 && (
                    <Badge tone="info">−{Number(discount)}%</Badge>
                  )}
                </div>
              )}
            </div>
            <div className="text-end">
              <div className="text-xs font-semibold text-muted">{t('total')}</div>
              <div className="text-xl font-extrabold text-ink">{formatSDG(lineTotal)}</div>
            </div>
          </div>

          {nextTier && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-600">
              <TrendingDown size={16} />
              {t('tier_savings', {
                qty: nextTier.min_qty,
                pct: Number(nextTier.discount_percent),
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper
              value={qty}
              onChange={setQty}
              min={product.min_order_qty}
              max={available > 0 ? available : undefined}
            />
            <Button
              size="lg"
              className="flex-1 min-w-[160px]"
              disabled={available <= 0}
              onClick={onAdd}
            >
              <ShoppingCart size={18} />
              {added ? t('added') : t('add_to_cart')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {(tiers.data ?? []).length > 0 && (
        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('price_list')}</CardTitle>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-start font-semibold">{t('quantity')}</th>
                  <th className="py-2 text-end font-semibold">{t('unit_price')}</th>
                </tr>
              </thead>
              <tbody>
                {(tiers.data ?? []).map((tier) => (
                  <tr key={tier.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 font-semibold text-ink">
                      {formatNumber(tier.min_qty)}+
                      {tier.company_id && (
                        <span className="ms-2">
                          <Badge tone="info">{t('company')}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-end font-semibold text-primary-700">
                      −{Number(tier.discount_percent)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}
