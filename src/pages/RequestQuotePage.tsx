import { useMemo, useState } from 'react'
import { FileQuestion, Plus, Send, Trash2, X } from 'lucide-react'
import {
  useAcceptQuotation,
  useCancelQuoteRequest,
  useQuotations,
  useQuoteRequests,
  useSubmitQuoteRequest,
  type QuoteRequestLine,
  type QuoteRequestWithItems,
} from '@/hooks/documents'
import { useProducts } from '@/hooks/queries'
import { useAuth } from '@/context/AuthProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatNumber, formatSDG, normalizeArabic } from '@/lib/format'
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
  QtyStepper,
  Skeleton,
  Textarea,
} from '@/components/ui'
import type { QuoteRequestStatus } from '@/lib/database.types'
import type { StringKey } from '@/i18n/strings'

/**
 * Customer-initiated request for quotation.
 *
 * A line may reference the catalog OR be free text: procurement routinely needs
 * things we do not stock yet, and refusing to record those just pushes the
 * conversation back to WhatsApp, which is what this platform exists to replace.
 * Free-text lines are priced by hand — the server reports them separately when
 * sales converts the request.
 */

const STATUS_KEY: Record<QuoteRequestStatus, StringKey> = {
  submitted: 'rq_submitted',
  in_review: 'rq_in_review',
  quoted: 'rq_quoted',
  declined: 'rq_declined',
  cancelled: 'rq_cancelled',
}
const STATUS_TONE: Record<QuoteRequestStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  submitted: 'info',
  in_review: 'info',
  quoted: 'success',
  declined: 'danger',
  cancelled: 'neutral',
}

interface Draft {
  key: string
  productId: string | null
  description: string
  qty: number
}

export default function RequestQuotePage() {
  const { t } = useI18n()
  const requests = useQuoteRequests()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('rq_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('rq_subtitle')}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          {open ? <X size={16} /> : <Plus size={16} />}
          {open ? t('cancel') : t('rq_new')}
        </Button>
      </div>

      {open && <RequestBuilder onDone={() => setOpen(false)} />}

      {requests.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (requests.data ?? []).length === 0 ? (
        <EmptyState
          icon={<FileQuestion size={30} />}
          title={t('rq_empty')}
          hint={t('rq_empty_hint')}
        />
      ) : (
        <div className="space-y-3">
          {(requests.data ?? []).map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}

      <ReceivedQuotations />
    </div>
  )
}

/**
 * Closes the loop. accept_quotation() already permitted a customer to convert
 * their own company's quotation — only the screen was missing, so an RFQ ended
 * at a quote number the requester could never open.
 */
function ReceivedQuotations() {
  const { t, lang } = useI18n()
  const { profile, isStaff } = useAuth()
  const quotations = useQuotations()
  const accept = useAcceptQuotation()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<string | null>(null)

  // Only a company admin may commit the company to an order.
  const canAccept = profile?.role === 'customer_admin'
  const live = (quotations.data ?? []).filter(
    (q) => q.status === 'draft' || q.status === 'sent',
  )

  // Staff have their own quotations screen; this section is the customer's.
  if (isStaff || quotations.isLoading || live.length === 0) return null

  const onAccept = async (id: string) => {
    setBusy(id)
    setError(null)
    try {
      const res = await accept.mutateAsync({ quotationId: id })
      setPlaced(res.order_number)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <CardTitle>{t('rq_my_quotes')}</CardTitle>
        <ul className="divide-y divide-line">
          {live.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-sm font-bold text-ink">{q.quote_number}</span>
                <div className="text-[11px] text-muted">
                  {t('valid_until')} {formatDate(q.valid_until, lang)}
                </div>
              </div>
              <span className="whitespace-nowrap font-semibold tabular-nums text-primary-700">
                {formatSDG(Number(q.total))}
              </span>
              {canAccept && (
                <Button size="sm" onClick={() => onAccept(q.id)} disabled={busy === q.id}>
                  {busy === q.id ? t('loading') : t('convert_to_order')}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {placed && (
          <Notice tone="success">
            {t('order_placed')} — <span className="font-mono">{placed}</span>
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </CardBody>
    </Card>
  )
}

function RequestCard({ request }: { request: QuoteRequestWithItems }) {
  const { t, pick, lang } = useI18n()
  const cancel = useCancelQuoteRequest()
  const [error, setError] = useState<string | null>(null)
  const isOpen = request.status === 'submitted' || request.status === 'in_review'

  const onCancel = async () => {
    setError(null)
    try {
      await cancel.mutateAsync(request.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-ink">{request.request_number}</span>
              <Badge tone={STATUS_TONE[request.status]}>{t(STATUS_KEY[request.status])}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted">
              {formatNumber(request.quote_request_items.length)} {t('items_count')} ·{' '}
              {formatDate(request.created_at, lang)}
              {request.needed_by && (
                <>
                  {' · '}
                  {t('rq_needed_by')} {formatDate(request.needed_by, lang)}
                </>
              )}
            </div>
          </div>
          {isOpen && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={cancel.isPending}>
              <Trash2 size={14} />
              {t('rq_withdraw')}
            </Button>
          )}
        </div>

        <ul className="divide-y divide-line text-sm">
          {request.quote_request_items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 flex-1 truncate">
                {i.products ? pick(i.products.name_ar, i.products.name_en) : i.description}
                {!i.products && (
                  <span className="ms-2 text-[11px] text-muted">({t('rq_off_catalog')})</span>
                )}
              </span>
              <span dir="ltr" className="shrink-0 tabular-nums text-muted">
                × {formatNumber(i.qty)}
              </span>
            </li>
          ))}
        </ul>

        {request.notes && <p className="text-sm text-muted">{request.notes}</p>}

        {request.status === 'quoted' && request.quotations?.quote_number && (
          <Notice tone="success">
            {t('rq_quote_ready')} —{' '}
            <span className="font-mono">{request.quotations.quote_number}</span>
          </Notice>
        )}
        {request.status === 'declined' && request.decline_reason && (
          <Notice tone="danger">{request.decline_reason}</Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </CardBody>
    </Card>
  )
}

function RequestBuilder({ onDone }: { onDone: () => void }) {
  const { t, pick } = useI18n()
  const products = useProducts()
  const submit = useSubmitQuoteRequest()

  const [search, setSearch] = useState('')
  const [freeText, setFreeText] = useState('')
  const [lines, setLines] = useState<Draft[]>([])
  const [notes, setNotes] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = normalizeArabic(search)
    if (!needle) return []
    return (products.data ?? [])
      .filter((p) => normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`).includes(needle))
      .slice(0, 6)
  }, [products.data, search])

  const addProduct = (productId: string) => {
    setLines((prev) =>
      prev.some((l) => l.productId === productId)
        ? prev
        : [...prev, { key: productId, productId, description: '', qty: 1 }],
    )
    setSearch('')
  }

  const addFreeText = () => {
    const text = freeText.trim()
    if (!text) return
    setLines((prev) => [
      ...prev,
      { key: `free-${Date.now()}`, productId: null, description: text, qty: 1 },
    ])
    setFreeText('')
  }

  const setQty = (key: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)))
  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const onSubmit = async () => {
    setError(null)
    try {
      const items: QuoteRequestLine[] = lines.map((l) =>
        l.productId
          ? { product_id: l.productId, qty: l.qty }
          : { description: l.description, qty: l.qty },
      )
      const res = await submit.mutateAsync({
        items,
        notes: notes.trim() || null,
        neededBy: neededBy || null,
      })
      setDone(res.request_number)
      setLines([])
      setNotes('')
      setNeededBy('')
      window.setTimeout(onDone, 1400)
    } catch (err) {
      // Postgres raises Arabic messages for business-rule violations.
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  const nameOf = (l: Draft) => {
    if (!l.productId) return l.description
    const p = products.data?.find((x) => x.id === l.productId)
    return p ? pick(p.name_ar, p.name_en) : l.productId
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <CardTitle>{t('rq_new')}</CardTitle>

        <div>
          <Label hint={t('rq_search_hint')}>{t('rq_add_from_catalog')}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
          />
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm transition-colors hover:bg-primary-50"
                  >
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {pick(p.name_ar, p.name_en)}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{p.sku}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Label hint={t('optional')}>{t('rq_add_free_text')}</Label>
          <div className="flex gap-2">
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFreeText()
                }
              }}
              placeholder={t('rq_free_text_ph')}
            />
            <Button variant="outline" onClick={addFreeText} disabled={!freeText.trim()}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {lines.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {lines.map((l) => (
              <li key={l.key} className="flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {nameOf(l)}
                  {!l.productId && (
                    <span className="ms-2 text-[11px] font-normal text-muted">
                      ({t('rq_off_catalog')})
                    </span>
                  )}
                </span>
                <QtyStepper value={l.qty} onChange={(q) => setQty(l.key, q)} />
                <button
                  type="button"
                  onClick={() => remove(l.key)}
                  aria-label={t('remove')}
                  className="text-status-critical transition-[filter] hover:brightness-90"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label hint={t('optional')}>{t('rq_needed_by')}</Label>
            <Input
              type="date"
              value={neededBy}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </div>
          <div>
            <Label hint={t('optional')}>{t('notes')}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {error && <Notice tone="danger">{error}</Notice>}
        {done && (
          <Notice tone="success">
            {t('rq_sent')} — <span className="font-mono">{done}</span>
          </Notice>
        )}

        <Button
          size="lg"
          onClick={onSubmit}
          disabled={lines.length === 0 || submit.isPending}
          className="w-full sm:w-auto"
        >
          <Send size={16} />
          {submit.isPending ? t('sending') : t('rq_send')}
        </Button>
      </CardBody>
    </Card>
  )
}
