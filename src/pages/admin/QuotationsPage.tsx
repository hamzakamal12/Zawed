import { useMemo, useState } from 'react'
import { Plus, Send, ShoppingBag, Trash2, X } from 'lucide-react'
import {
  useAcceptQuotation,
  useCompanies,
  useCreateQuotation,
  useQuotations,
  useSendQuotation,
  type QuotationWithItems,
} from '@/hooks/documents'
import { useProducts } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatSDG, normalizeArabic } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  Input,
  Label,
  QtyStepper,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { DocumentButton, WhatsAppShare } from '@/components/DocumentButtons'
import type { QuotationStatus } from '@/lib/database.types'
import type { DocData } from '@/lib/pdf/documents'
import type { StringKey } from '@/i18n/strings'

const STATUS_KEY: Record<QuotationStatus, StringKey> = {
  draft: 'qs_draft',
  sent: 'qs_sent',
  accepted: 'qs_accepted',
  rejected: 'qs_rejected',
  expired: 'qs_expired',
}
const STATUS_TONE: Record<QuotationStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
}

export default function QuotationsPage() {
  const { t, pick, lang } = useI18n()
  const quotations = useQuotations()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">{t('quotations_title')}</h1>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? <X size={16} /> : <Plus size={16} />}
          {creating ? t('cancel') : t('new_quotation')}
        </Button>
      </div>

      {creating && <QuotationBuilder onDone={() => setCreating(false)} />}

      {quotations.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (quotations.data ?? []).length === 0 ? (
        <EmptyState title={t('no_quotations')} />
      ) : (
        <div className="space-y-3">
          {(quotations.data ?? []).map((q) => (
            <QuotationCard key={q.id} quote={q} t={t} pick={pick} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuotationCard({
  quote,
  t,
  pick,
  lang,
}: {
  quote: QuotationWithItems
  t: (k: StringKey, v?: Record<string, string | number>) => string
  pick: (a: string | null | undefined, b: string | null | undefined) => string
  lang: 'ar' | 'en'
}) {
  const send = useSendQuotation()
  const accept = useAcceptQuotation()
  const [po, setPo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [converted, setConverted] = useState<string | null>(null)

  const daysLeft = Math.ceil((new Date(quote.valid_until).getTime() - Date.now()) / 86_400_000)
  const isLive = quote.status === 'draft' || quote.status === 'sent'

  const buildDoc = (): DocData => ({
    kind: 'quotation',
    number: quote.quote_number ?? '—',
    date: quote.created_at,
    validUntil: quote.valid_until,
    customer: {
      name: quote.companies ? pick(quote.companies.name_ar, quote.companies.name_en) : '—',
      address: quote.companies?.billing_address ?? null,
      taxId: quote.companies?.tax_id ?? null,
    },
    lines: quote.quotation_items.map((i) => ({
      name: i.products ? pick(i.products.name_ar, i.products.name_en) : '—',
      sku: i.products?.sku ?? '',
      qty: i.qty,
      unitPrice: Number(i.unit_price_snapshot),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(quote.subtotal),
    vatPercent: Number(quote.vat_percent),
    vatAmount: Number(quote.vat_amount),
    total: Number(quote.total),
    fxRate: quote.fx_rate_snapshot,
    notes: quote.notes_ar,
    terms: quote.terms_ar,
  })

  const shareText = [
    `${t('doc_quotation')}: ${quote.quote_number}`,
    quote.companies ? pick(quote.companies.name_ar, quote.companies.name_en) : '',
    `${t('total')}: ${formatSDG(Number(quote.total))}`,
    `${t('valid_until')}: ${formatDate(quote.valid_until, lang)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const onConvert = async () => {
    setError(null)
    try {
      const res = await accept.mutateAsync({ quotationId: quote.id, poNumber: po || null })
      setConverted(res.order_number)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-ink">{quote.quote_number}</span>
              <Badge tone={STATUS_TONE[quote.status]}>{t(STATUS_KEY[quote.status])}</Badge>
              {isLive && daysLeft >= 0 && (
                <Badge tone={daysLeft <= 2 ? 'warning' : 'neutral'}>
                  {t('expires_in', { d: daysLeft })}
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-muted">
              {quote.companies ? pick(quote.companies.name_ar, quote.companies.name_en) : '—'} ·{' '}
              {quote.quotation_items.length} {t('items_count')} · {formatDate(quote.created_at, lang)}
            </div>
          </div>
          <div className="text-lg font-extrabold text-primary-700">
            {formatSDG(Number(quote.total))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentButton kind="quotation" build={buildDoc} />
          <DocumentButton kind="proforma" build={() => ({ ...buildDoc(), kind: 'proforma' })} />
          <WhatsAppShare text={shareText} />
          {quote.status === 'draft' && (
            <Button variant="ghost" size="sm" onClick={() => send.mutate(quote.id)} disabled={send.isPending}>
              <Send size={14} />
              {t('mark_sent')}
            </Button>
          )}
        </div>

        {isLive && (
          <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <div className="w-44">
              <Label hint={t('optional')}>{t('po_number')}</Label>
              <Input value={po} onChange={(e) => setPo(e.target.value)} dir="ltr" className="h-9" />
            </div>
            <Button size="sm" onClick={onConvert} disabled={accept.isPending}>
              <ShoppingBag size={14} />
              {accept.isPending ? t('loading') : t('convert_to_order')}
            </Button>
          </div>
        )}

        {converted && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {t('converted')} — {converted}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

function QuotationBuilder({ onDone }: { onDone: () => void }) {
  const { t, pick } = useI18n()
  const companies = useCompanies()
  const products = useProducts()
  const create = useCreateQuotation()

  const [companyId, setCompanyId] = useState('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([])
  const [validity, setValidity] = useState(7)
  const [vat, setVat] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = normalizeArabic(search)
    if (!needle) return []
    return (products.data ?? [])
      .filter((p) => normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`).includes(needle))
      .slice(0, 6)
  }, [products.data, search])

  const addLine = (productId: string) => {
    setLines((prev) =>
      prev.some((l) => l.productId === productId) ? prev : [...prev, { productId, qty: 1 }],
    )
    setSearch('')
  }

  const submit = async () => {
    setError(null)
    try {
      const res = await create.mutateAsync({
        companyId,
        items: lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
        notes: notes || null,
        terms: terms || null,
        vatPercent: vat,
        validityDays: validity,
      })
      setDone(res.quote_number)
      setLines([])
      window.setTimeout(onDone, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <CardTitle>{t('new_quotation')}</CardTitle>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label>{t('select_company')}</Label>
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">—</option>
              {(companies.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c.name_ar, c.name_en)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('validity_days')}</Label>
            <Input
              type="number"
              min={1}
              value={validity}
              onChange={(e) => setValidity(Math.max(1, Number(e.target.value) || 7))}
            />
          </div>
          <div>
            <Label>{t('vat')} %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={vat}
              onChange={(e) => setVat(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <div>
          <Label>{t('add_item')}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
          />
          {matches.length > 0 && (
            <ul className="mt-1 divide-y divide-line rounded-lg border border-line bg-white">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => addLine(p.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-primary-50"
                  >
                    <span className="font-medium">{pick(p.name_ar, p.name_en)}</span>
                    <span className="font-mono text-[11px] text-muted">{p.sku}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {lines.map((l) => {
              const p = products.data?.find((x) => x.id === l.productId)
              return (
                <li key={l.productId} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {p ? pick(p.name_ar, p.name_en) : l.productId}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{p?.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <QtyStepper
                      value={l.qty}
                      onChange={(qty) =>
                        setLines((prev) =>
                          prev.map((x) => (x.productId === l.productId ? { ...x, qty } : x)),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((x) => x.productId !== l.productId))}
                      className="text-red-600 hover:text-red-700"
                      aria-label={t('remove')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label hint={t('optional')}>{t('notes')}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label hint={t('optional')}>{t('terms')}</Label>
            <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {done && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {t('quote_created')} — {done}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={!companyId || lines.length === 0 || create.isPending}
          size="lg"
        >
          {create.isPending ? t('creating') : t('create')}
        </Button>
      </CardBody>
    </Card>
  )
}
