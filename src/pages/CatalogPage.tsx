import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, PackageSearch, Check, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useCategories, useCatalogPrices, useInventory, useProducts } from '@/hooks/queries'
import { useCart } from '@/context/CartProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatSDG, normalizeArabic } from '@/lib/format'
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input, Skeleton } from '@/components/ui'
import type { Inventory, Product } from '@/lib/database.types'

export default function CatalogPage() {
  const { t, pick } = useI18n()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const categories = useCategories()
  const products = useProducts()
  const prices = useCatalogPrices()
  const inventory = useInventory()

  const stockByProduct = useMemo(() => {
    const map = new Map<string, Inventory>()
    for (const row of inventory.data ?? []) map.set(row.product_id, row)
    return map
  }, [inventory.data])

  const visible = useMemo(() => {
    const needle = normalizeArabic(search)
    return (products.data ?? []).filter((p) => {
      if (categoryId && p.category_id !== categoryId) return false
      if (!needle) return true
      const haystack = normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`)
      return haystack.includes(needle)
    })
  }, [products.data, categoryId, search])

  if (products.isError) {
    return (
      <ErrorState
        message={t('error_generic')}
        retryLabel={t('retry')}
        onRetry={() => products.refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">{t('catalog_title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('catalog_subtitle')}</p>
      </header>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted start-3"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="ps-10"
        />
      </div>

      {/* Category chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
          {t('all_categories')}
        </Chip>
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {pick(c.name_ar, c.name_en)}
          </Chip>
        ))}
      </div>

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<PackageSearch size={40} />} title={t('no_results')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              price={prices.data?.[product.id]?.unit_price_sdg ?? null}
              priceLoading={prices.isLoading}
              stock={stockByProduct.get(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-primary-600 text-white'
          : 'border border-line bg-white text-muted hover:bg-primary-50',
      )}
    >
      {children}
    </button>
  )
}

function ProductTile({
  product,
  price,
  priceLoading,
  stock,
}: {
  product: Product
  price: number | null
  priceLoading: boolean
  stock: Inventory | undefined
}) {
  const { t, pick } = useI18n()
  const { add, qtyOf } = useCart()
  const inCart = qtyOf(product.id)

  const available = Math.max((stock?.qty_on_hand ?? 0) - (stock?.qty_reserved ?? 0), 0)
  const isOut = available <= 0
  const isLow = !isOut && available <= (stock?.reorder_point ?? 0)

  return (
    <Card className="flex h-full flex-col">
      <Link to={`/catalog/${product.id}`} className="block p-4 pb-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-[11px] font-mono text-muted">{product.sku}</span>
          {isOut ? (
            <Badge tone="danger">{t('out_of_stock')}</Badge>
          ) : isLow ? (
            <Badge tone="warning">{t('low_stock')}</Badge>
          ) : (
            <Badge tone="success">{t('in_stock')}</Badge>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">
          {pick(product.name_ar, product.name_en)}
        </h3>
        <div className="mt-2">
          {priceLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div className="text-lg font-extrabold text-primary-700">{formatSDG(price)}</div>
          )}
          <div className="text-[11px] text-muted">
            {t('per_unit')} · {t('min_order')} {product.min_order_qty}
          </div>
        </div>
      </Link>

      <CardBody className="mt-auto pt-0">
        <Button
          size="sm"
          className="w-full"
          disabled={isOut}
          variant={inCart ? 'outline' : 'primary'}
          onClick={() => add(product.id, product.min_order_qty)}
        >
          {inCart ? <Check size={15} /> : <Plus size={15} />}
          {inCart ? `${t('added')} (${inCart})` : t('add_to_cart')}
        </Button>
      </CardBody>
    </Card>
  )
}
