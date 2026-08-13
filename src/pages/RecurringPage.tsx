import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Pause, Play, Plus, Repeat, Trash2, X } from 'lucide-react'
import {
  useRecurringOrders,
  useRunRecurringOrder,
  useSaveRecurringOrder,
  useToggleRecurring,
} from '@/hooks/documents'
import { useProducts } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, normalizeArabic } from '@/lib/format'
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
} from '@/components/ui'
import type { RecurringFrequency } from '@/lib/database.types'
import type { StringKey } from '@/i18n/strings'

const FREQ_KEY: Record<RecurringFrequency, StringKey> = {
  weekly: 'freq_weekly',
  monthly: 'freq_monthly',
  quarterly: 'freq_quarterly',
}

export default function RecurringPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const lists = useRecurringOrders()
  const run = useRunRecurringOrder()
  const toggle = useToggleRecurring()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onRun = async (id: string) => {
    setError(null)
    try {
      const res = await run.mutateAsync(id)
      navigate(`/orders/${res.order_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t('recurring_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('recurring_hint')}</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? <X size={16} /> : <Plus size={16} />}
          {creating ? t('cancel') : t('new_recurring')}
        </Button>
      </div>

      {creating && <RecurringBuilder onDone={() => setCreating(false)} />}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {lists.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (lists.data ?? []).length === 0 ? (
        <EmptyState icon={<Repeat size={40} />} title={t('recurring_empty')} />
      ) : (
        <div className="space-y-3">
          {(lists.data ?? []).map((list) => (
            <Card key={list.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{list.name}</span>
                    <Badge tone={list.is_active ? 'success' : 'neutral'}>
                      {list.is_active ? t('active') : t('paused')}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{t(FREQ_KEY[list.frequency])}</span>
                    <span>·</span>
                    <span>{t('items_in_list', { n: list.items?.length ?? 0 })}</span>
                    {list.next_run_date && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={12} />
                          {t('next_run')} {formatDate(list.next_run_date, lang)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle.mutate({ id: list.id, isActive: !list.is_active })}
                    disabled={toggle.isPending}
                  >
                    {list.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <Button size="sm" onClick={() => onRun(list.id)} disabled={run.isPending || !list.is_active}>
                    <Repeat size={14} />
                    {run.isPending ? t('running') : t('confirm_this_month')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function RecurringBuilder({ onDone }: { onDone: () => void }) {
  const { t, pick } = useI18n()
  const products = useProducts()
  const save = useSaveRecurringOrder()

  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = normalizeArabic(search)
    if (!needle) return []
    return (products.data ?? [])
      .filter((p) => normalizeArabic(`${p.name_ar} ${p.name_en ?? ''} ${p.sku}`).includes(needle))
      .slice(0, 6)
  }, [products.data, search])

  const submit = async () => {
    setError(null)
    try {
      await save.mutateAsync({
        name,
        frequency,
        items: lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <CardTitle>{t('new_recurring')}</CardTitle>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t('list_name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="توريد شهري للمكتب" />
          </div>
          <div>
            <Label>{t('frequency')}</Label>
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
            >
              {(Object.keys(FREQ_KEY) as RecurringFrequency[]).map((f) => (
                <option key={f} value={f}>
                  {t(FREQ_KEY[f])}
                </option>
              ))}
            </Select>
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
                    onClick={() => {
                      setLines((prev) =>
                        prev.some((l) => l.productId === p.id) ? prev : [...prev, { productId: p.id, qty: 1 }],
                      )
                      setSearch('')
                    }}
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
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {p ? pick(p.name_ar, p.name_en) : l.productId}
                  </span>
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

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <Button onClick={submit} disabled={!name || lines.length === 0 || save.isPending} size="lg">
          {save.isPending ? t('creating') : t('save')}
        </Button>
      </CardBody>
    </Card>
  )
}
