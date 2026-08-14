import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useCurrentFx, useFxHistory, useFxStatus, useSetFxRate, useSetFxThresholds } from '@/hooks/queries'
import FxAgeNotice from '@/components/FxAgeNotice'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDateTime, formatNumber, hoursSince } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Input,
  Label,
  Notice,
  Select,
  Skeleton,
} from '@/components/ui'
import type { FxSource } from '@/lib/database.types'

export default function AdminFxPage() {
  const { t, lang } = useI18n()
  const current = useCurrentFx()
  const history = useFxHistory(10)
  const save = useSetFxRate()

  const [rate, setRate] = useState('')
  const [source, setSource] = useState<FxSource>('parallel_market')
  const [done, setDone] = useState(false)

  // The age judgement comes from the server, which is also what enforces it —
  // a local `age > 24` here could show "fine" for a rate the server is about
  // to refuse. hoursSince() is kept only for the display line.
  const age = hoursSince(current.data?.effective_from)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(rate)
    if (!Number.isFinite(value) || value <= 0) return
    await save.mutateAsync({ rate: value, source })
    setRate('')
    setDone(true)
    window.setTimeout(() => setDone(false), 2500)
  }

  const sourceLabel: Record<FxSource, string> = {
    manual: t('fx_manual'),
    parallel_market: t('fx_parallel'),
    central_bank: t('fx_central'),
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">{t('fx_title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('fx_subtitle')}</p>
      </header>

      <FxAgeNotice />

      <Card>
        <CardBody>
          <div className="mb-4 rounded-xl bg-primary-700 p-5 text-center text-white">
            <div className="text-xs font-semibold opacity-90">{t('current_fx')}</div>
            {current.isLoading ? (
              <Skeleton className="mx-auto mt-2 h-10 w-40 bg-white/30" />
            ) : (
              <>
                <div className="mt-1 text-4xl font-extrabold tabular-nums">
                  {formatNumber(current.data?.rate_sdg_per_usd ?? null)}
                </div>
                <div className="mt-1 text-xs opacity-90">
                  ج.س / $1
                  {age != null && <> · {t('fx_updated_ago', { h: Math.floor(age) })}</>}
                </div>
              </>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t('fx_new_rate')}</Label>
              {/* Single field, big and obvious — this is a daily task. */}
              <Input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.0001"
                required
                dir="ltr"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="2600"
                className="h-14 text-center text-2xl font-extrabold"
              />
            </div>

            <div>
              <Label>{t('fx_source')}</Label>
              <Select value={source} onChange={(e) => setSource(e.target.value as FxSource)}>
                <option value="parallel_market">{t('fx_parallel')}</option>
                <option value="central_bank">{t('fx_central')}</option>
                <option value="manual">{t('fx_manual')}</option>
              </Select>
            </div>

            {done && (
              <Notice tone="success" icon={<CheckCircle2 size={16} />}>
                {t('fx_saved')}
              </Notice>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
              {save.isPending ? t('loading') : t('fx_save')}
            </Button>
          </form>
        </CardBody>
      </Card>

      <FxLimits />

      <Card>
        <CardBody>
          <CardTitle className="mb-3">{t('fx_history')}</CardTitle>
          {history.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {(history.data ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="text-sm text-muted">
                    {formatDateTime(row.effective_from, lang)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{sourceLabel[row.source]}</Badge>
                    <span className="font-bold tabular-nums text-ink">
                      {formatNumber(row.rate_sdg_per_usd)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The two thresholds, editable because they are a business call and not a
 * constant: how fast the market moves is something the person updating the
 * rate every morning knows better than the code does.
 */
function FxLimits() {
  const { t } = useI18n()
  const fx = useFxStatus()
  const save = useSetFxThresholds()
  const [warn, setWarn] = useState('')
  const [block, setBlock] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Seeded from the server the first time it arrives, so the fields show what
  // is actually in force rather than a hardcoded guess.
  const warnValue = warn || String(fx.data?.warn_after ?? '')
  const blockValue = block || String(fx.data?.block_after ?? '')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await save.mutateAsync({ warnAfter: Number(warnValue), blockAfter: Number(blockValue) })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-1">{t('fx_limits_title')}</CardTitle>
        <p className="mb-4 text-sm leading-relaxed text-muted">{t('fx_limits_note')}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t('fx_warn_after')}</Label>
              <Input
                type="number"
                min="1"
                max="8760"
                dir="ltr"
                value={warnValue}
                onChange={(e) => setWarn(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('fx_block_after')}</Label>
              <Input
                type="number"
                min="1"
                max="8760"
                dir="ltr"
                value={blockValue}
                onChange={(e) => setBlock(e.target.value)}
              />
              {/* Below the field rather than as a Label hint: beside a label
                  this long it wrapped onto two lines and crowded the input. */}
              <p className="mt-1 text-[11px] text-muted">{t('fx_limits_hint')}</p>
            </div>
          </div>

          {saved && <Notice tone="success">{t('fx_limits_saved')}</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}

          <Button
            type="submit"
            variant="outline"
            disabled={save.isPending || !(Number(blockValue) >= Number(warnValue))}
          >
            {save.isPending ? t('loading') : t('save')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
