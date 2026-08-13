import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, PackageSearch, Plus, Search, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useCategories, useCatalogPrices, useInventory, useProducts } from '@/hooks/queries'
import { useCart } from '@/context/CartProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatSDG, normalizeArabic } from '@/lib/format'
import { Badge, Button, Card, EmptyState, ErrorState, Input, Skeleton } from '@/components/ui'
import { CategoryGlyph } from '@/components/CategoryGlyph'
import type { Category, Inventory, Product } from '@/lib/database.types'

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

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories.data ?? []) map.set(c.id, c)
    return map
  }, [categories.data])

  const visible = useMemo(() => {
    const needle = normalizeArabic(search)
    return (products.data ?? []).filter((p) => {
      if (categoryId && p.category_id !== categoryId) return false
      if (!needle) return true
      return normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`).includes(needle)
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
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {t('catalog_title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('catalog_subtitle')}</p>
      </header>

      {/* Search + filters stay in one row above the grid. */}
      <div className="sticky top-14 z-10 -mx-4 space-y-3 bg-canvas/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted start-3"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="h-12 ps-10 shadow-card"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
            <SlidersHorizontal size={14} />
            {t('all_categories')}
          </Chip>
          {(categories.data ?? []).map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              <CategoryGlyph icon={c.icon} size={14} />
              {pick(c.name_ar, c.name_en)}
            </Chip>
          ))}
        </div>
      </div>

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<PackageSearch size={30} />} title={t('no_results')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product, i) => (
            <div
              key={product.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 11) * 25}ms` }}
            >
              <ProductTile
                product={product}
                category={product.category_id ? categoryById.get(product.category_id) : undefined}
                price={prices.data?.[product.id]?.unit_price_sdg ?? null}
                priceLoading={prices.isLoading}
                stock={stockByProduct.get(product.id)}
              />
            </div>
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all',
        active
          ? 'bg-primary-700 text-white shadow-sm'
          : 'border border-line bg-white text-muted hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700',
      )}
    >
      {children}
    </button>
  )
}

function ProductTile({
  product,
  category,
  price,
  priceLoading,
  stock,
}: {
  product: Product
  category: Category | undefined
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
    <Card interactive className="flex h-full flex-col overflow-hidden">
      <Link to={`/catalog/${product.id}`} className="flex flex-1 flex-col">
        {/* Category band — gives every tile a recognisable identity without images. */}
        <div className="relative flex h-20 items-center justify-center bg-primary-50">
          <div className="bg-dotted absolute inset-0 opacity-60" aria-hidden />
          <CategoryGlyph icon={category?.icon} size={28} className="relative text-primary-500" />
          <span className="absolute top-2 end-2">
            {isOut ? (
              <Badge tone="danger">{t('out_of_stock')}</Badge>
            ) : isLow ? (
              <Badge tone="warning">{t('low_stock')}</Badge>
            ) : (
              <Badge tone="success">{t('in_stock')}</Badge>
            )}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4 pb-3">
          <div className="text-[11px] font-semibold text-primary-700">
            {category ? pick(category.name_ar, category.name_en) : product.sku}
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-ink">
            {pick(product.name_ar, product.name_en)}
          </h3>

          <div className="mt-auto pt-3">
            {priceLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold tracking-tight text-primary-700">
                  {formatSDG(price)}
                </span>
              </div>
            )}
            <div className="mt-0.5 text-[11px] text-muted">
              {t('per_unit')} · {t('min_order')} {product.min_order_qty}
            </div>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
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
      </div>
    </Card>
  )
}
