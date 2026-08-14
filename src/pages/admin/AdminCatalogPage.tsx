import { useMemo, useState } from 'react'
import { Check, Package, PackageSearch, Plus, Search, X } from 'lucide-react'
import {
  useAdminCatalog,
  useSaveProduct,
  useSetProductPrice,
  useSetStock,
  type ProductAdminRow,
  type ProductDraft,
} from '@/hooks/catalogAdmin'
import { useCategories, useCurrentFx } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatNumber, formatSDG, normalizeArabic } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Notice,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { CategoryGlyph } from '@/components/CategoryGlyph'
import type { ProductUnit } from '@/lib/database.types'

const UNITS: ProductUnit[] = ['piece', 'box', 'ream', 'carton', 'kg', 'liter']

const BLANK: ProductDraft = {
  sku: '',
  name_ar: '',
  name_en: '',
  category_id: '',
  unit: 'piece',
  units_per_pack: 1,
  min_order_qty: 1,
  lead_time_days: 0,
  description_ar: '',
  is_active: true,
}

/**
 * Catalog administration.
 *
 * The one thing this screen must get right is that an admin never types a
 * selling price. Prices are derived — cost in USD, times margin, times today's
 * FX — so the form takes cost and margin and shows the resulting SDG price
 * live, computed the same way the server does. Letting someone type a fixed
 * price here would quietly reintroduce exactly the stale-price problem the
 * whole platform exists to avoid.
 */
export default function AdminCatalogPage() {
  const { t, pick } = useI18n()
  const catalog = useAdminCatalog()
  const categories = useCategories()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ProductDraft | null>(null)

  const rows = useMemo(() => {
    const needle = normalizeArabic(search)
    const all = catalog.data ?? []
    if (!needle) return all
    return all.filter((p) =>
      normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`).includes(needle),
    )
  }, [catalog.data, search])

  const categoryName = (id: string | null) => {
    const c = (categories.data ?? []).find((x) => x.id === id)
    return c ? pick(c.name_ar, c.name_en) : '—'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('cat_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('cat_subtitle')}</p>
        </div>
        <Button onClick={() => setEditing(editing ? null : { ...BLANK })}>
          {editing ? <X size={16} /> : <Plus size={16} />}
          {editing ? t('cancel') : t('cat_new_product')}
        </Button>
      </div>

      {editing && (
        <ProductForm
          draft={editing}
          onClose={() => setEditing(null)}
          categories={(categories.data ?? []).map((c) => ({
            id: c.id,
            label: pick(c.name_ar, c.name_en),
          }))}
        />
      )}

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted start-3"
          // Decorative: the field's own placeholder already says what it is,
          // so announcing the glyph adds a stray "image" to the reading order.
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="h-12 ps-10"
        />
      </div>

      {catalog.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<PackageSearch size={30} />} title={t('no_results')} />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              categoryLabel={categoryName(p.category_id)}
              onEdit={() =>
                setEditing({
                  id: p.id,
                  sku: p.sku,
                  name_ar: p.name_ar,
                  name_en: p.name_en ?? '',
                  category_id: p.category_id ?? '',
                  unit: p.unit,
                  units_per_pack: p.units_per_pack,
                  min_order_qty: p.min_order_qty,
                  lead_time_days: p.lead_time_days,
                  description_ar: p.description_ar ?? '',
                  is_active: p.is_active,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ProductRow({
  product,
  categoryLabel,
  onEdit,
}: {
  product: ProductAdminRow
  categoryLabel: string
  onEdit: () => void
}) {
  const { t, pick } = useI18n()
  const fx = useCurrentFx()
  const [open, setOpen] = useState(false)

  const rate = fx.data?.rate_sdg_per_usd ?? null
  const live = livePrice(product.price?.cost_usd, product.price?.margin_percent, rate)
  const available = Math.max((product.stock?.qty_on_hand ?? 0) - (product.stock?.qty_reserved ?? 0), 0)

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-ink">{product.sku}</span>
              {!product.is_active && <Badge tone="neutral">{t('cat_inactive')}</Badge>}
              {!product.price && <Badge tone="danger">{t('cat_no_price')}</Badge>}
            </div>
            <div className="mt-1 truncate font-semibold text-ink">
              {pick(product.name_ar, product.name_en)}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
              <CategoryGlyph icon={null} size={12} />
              {categoryLabel} · {t('cat_stock')}: <span dir="ltr">{formatNumber(available)}</span>
            </div>
          </div>

          <div className="text-end">
            <div className="text-lg font-extrabold text-primary-700">
              {live == null ? '—' : formatSDG(live)}
            </div>
            {product.price && (
              <div className="text-[11px] text-muted" dir="ltr">
                ${Number(product.price.cost_usd).toFixed(2)} + {Number(product.price.margin_percent)}%
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button variant="outline" size="sm" onClick={onEdit}>
            {t('cat_edit_details')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? t('cancel') : t('cat_price_and_stock')}
          </Button>
        </div>

        {open && <PriceAndStock product={product} rate={rate} onDone={() => setOpen(false)} />}
      </CardBody>
    </Card>
  )
}

/** Mirrors get_price(): cost x (1 + margin) x fx, rounded UP to the nearest 100. */
function livePrice(
  cost: number | undefined,
  margin: number | undefined,
  rate: number | null,
): number | null {
  if (cost == null || margin == null || rate == null) return null
  return Math.ceil((Number(cost) * (1 + Number(margin) / 100) * rate) / 100) * 100
}

function PriceAndStock({
  product,
  rate,
  onDone,
}: {
  product: ProductAdminRow
  rate: number | null
  onDone: () => void
}) {
  const { t } = useI18n()
  const setPrice = useSetProductPrice()
  const setStock = useSetStock()
  const [cost, setCost] = useState(String(product.price?.cost_usd ?? ''))
  const [margin, setMargin] = useState(String(product.price?.margin_percent ?? 20))
  const [onHand, setOnHand] = useState(String(product.stock?.qty_on_hand ?? 0))
  const [reorder, setReorder] = useState(String(product.stock?.reorder_point ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const preview = livePrice(Number(cost) || undefined, Number(margin), rate)

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setError(null)
    setSaved(null)
    try {
      await fn()
      setSaved(msg)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-canvas p-4">
      <div>
        <CardTitle className="mb-3 text-sm">{t('cat_pricing')}</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>{t('cat_cost_usd')}</Label>
            <Input
              type="number"
              min="0.0001"
              step="0.0001"
              dir="ltr"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('cat_margin')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              dir="ltr"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('cat_resulting_price')}</Label>
            <div className="flex h-11 items-center rounded-lg border border-line bg-white px-3 font-extrabold text-primary-700">
              {preview == null ? '—' : formatSDG(preview)}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{t('cat_price_note')}</p>
        <Button
          size="sm"
          className="mt-3"
          disabled={setPrice.isPending || !(Number(cost) > 0)}
          onClick={() =>
            run(
              () =>
                setPrice.mutateAsync({
                  productId: product.id,
                  costUsd: Number(cost),
                  marginPercent: Number(margin) || 0,
                }),
              t('cat_price_saved'),
            )
          }
        >
          <Check size={15} />
          {setPrice.isPending ? t('loading') : t('cat_save_price')}
        </Button>
      </div>

      <div className="border-t border-line pt-4">
        <CardTitle className="mb-3 text-sm">{t('cat_stock_section')}</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>{t('cat_qty_on_hand')}</Label>
            <Input
              type="number"
              min="0"
              dir="ltr"
              value={onHand}
              onChange={(e) => setOnHand(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('cat_reorder_point')}</Label>
            <Input
              type="number"
              min="0"
              dir="ltr"
              value={reorder}
              onChange={(e) => setReorder(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('cat_reserved')}</Label>
            <div className="flex h-11 items-center rounded-lg border border-line bg-white px-3 text-muted">
              <span dir="ltr">{formatNumber(product.stock?.qty_reserved ?? 0)}</span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={setStock.isPending}
          onClick={() =>
            run(
              () =>
                setStock.mutateAsync({
                  productId: product.id,
                  qtyOnHand: Number(onHand) || 0,
                  reorderPoint: Number(reorder) || 0,
                }),
              t('cat_stock_saved'),
            )
          }
        >
          <Check size={15} />
          {setStock.isPending ? t('loading') : t('cat_save_stock')}
        </Button>
      </div>

      {saved && <Notice tone="success">{saved}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}

      <Button variant="ghost" size="sm" onClick={onDone}>
        {t('close')}
      </Button>
    </div>
  )
}

function ProductForm({
  draft,
  categories,
  onClose,
}: {
  draft: ProductDraft
  categories: { id: string; label: string }[]
  onClose: () => void
}) {
  const { t } = useI18n()
  const save = useSaveProduct()
  const [d, setD] = useState<ProductDraft>(draft)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await save.mutateAsync(d)
      onClose()
    } catch (err) {
      // A duplicate SKU surfaces here as a unique-violation from Postgres.
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-4">{d.id ? t('cat_edit_product') : t('cat_new_product')}</CardTitle>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t('sku')}</Label>
              <Input
                required
                dir="ltr"
                value={d.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="ZW-PAP-A4"
              />
            </div>
            <div>
              <Label>{t('cat_category')}</Label>
              <Select
                value={d.category_id ?? ''}
                onChange={(e) => set('category_id', e.target.value)}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('cat_name_ar')}</Label>
              <Input required value={d.name_ar} onChange={(e) => set('name_ar', e.target.value)} />
            </div>
            <div>
              <Label hint={t('optional')}>{t('cat_name_en')}</Label>
              <Input
                dir="ltr"
                value={d.name_en ?? ''}
                onChange={(e) => set('name_en', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('unit')}</Label>
              <Select value={d.unit} onChange={(e) => set('unit', e.target.value as ProductUnit)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`unit_${u}` as 'unit_piece')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('units_per_pack')}</Label>
              <Input
                type="number"
                min="1"
                dir="ltr"
                value={d.units_per_pack}
                onChange={(e) => set('units_per_pack', Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>{t('min_order')}</Label>
              <Input
                type="number"
                min="1"
                dir="ltr"
                value={d.min_order_qty}
                onChange={(e) => set('min_order_qty', Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>{t('lead_time')}</Label>
              <Input
                type="number"
                min="0"
                dir="ltr"
                value={d.lead_time_days}
                onChange={(e) => set('lead_time_days', Number(e.target.value) || 0)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label hint={t('optional')}>{t('cat_description')}</Label>
              <Textarea
                rows={2}
                value={d.description_ar ?? ''}
                onChange={(e) => set('description_ar', e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={d.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4 accent-[#0a6d74]"
            />
            {t('cat_active')}
          </label>

          {error && <Notice tone="danger">{error}</Notice>}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              <Package size={15} />
              {save.isPending ? t('loading') : t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
          </div>

          {!d.id && <p className="text-xs text-muted">{t('cat_then_set_price')}</p>}
        </form>
      </CardBody>
    </Card>
  )
}
