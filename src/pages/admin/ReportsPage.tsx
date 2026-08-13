import { useReports } from '@/hooks/documents'
import { useI18n } from '@/i18n/I18nProvider'
import { formatNumber, formatSDG, formatUSD } from '@/lib/format'
import { Card, CardBody, CardTitle, Skeleton } from '@/components/ui'

export default function ReportsPage() {
  const { t, pick, lang } = useI18n()
  const reports = useReports()

  if (reports.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    )
  }

  const d = reports.data
  const monthLabel = (iso: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))

  const maxRevenue = Math.max(1, ...(d?.revenue ?? []).map((r) => Number(r.revenue_sdg)))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('reports_title')}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by month — a bar per month keeps this readable on a phone. */}
        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('revenue_by_month')}</CardTitle>
            {(d?.revenue ?? []).length === 0 ? (
              <Empty t={t} />
            ) : (
              <ul className="space-y-2">
                {(d?.revenue ?? []).map((r) => (
                  <li key={r.month}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-ink">{monthLabel(r.month)}</span>
                      <span className="tabular-nums">
                        {formatSDG(Number(r.revenue_sdg))}
                        <span className="ms-2 text-xs text-muted">
                          {formatUSD(Number(r.revenue_usd))}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary-600"
                        style={{ width: `${(Number(r.revenue_sdg) / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('margin_analysis')}</CardTitle>
            {(d?.margin ?? []).length === 0 ? (
              <Empty t={t} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="py-2 text-start font-semibold">{t('order_date')}</th>
                      <th className="py-2 text-end font-semibold">{t('revenue')}</th>
                      <th className="py-2 text-end font-semibold">{t('cost')}</th>
                      <th className="py-2 text-end font-semibold">{t('margin')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d?.margin ?? []).map((m) => (
                      <tr key={m.month} className="border-b border-line/60 last:border-0">
                        <td className="py-2 font-semibold">{monthLabel(m.month)}</td>
                        <td className="py-2 text-end tabular-nums">{formatSDG(Number(m.revenue_sdg))}</td>
                        <td className="py-2 text-end tabular-nums text-muted">
                          {formatSDG(Number(m.cost_sdg))}
                        </td>
                        <td className="py-2 text-end font-bold tabular-nums text-primary-700">
                          {Number(m.margin_percent)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('top_customers')}</CardTitle>
            {(d?.customers ?? []).length === 0 ? (
              <Empty t={t} />
            ) : (
              <ul className="divide-y divide-line">
                {(d?.customers ?? []).map((c) => (
                  <li key={c.company_id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{pick(c.name_ar, c.name_en)}</div>
                      <div className="text-[11px] text-muted">
                        {formatNumber(c.orders_count)} {t('items_count')}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{formatSDG(Number(c.revenue_sdg))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-3">{t('top_products')}</CardTitle>
            {(d?.products ?? []).length === 0 ? (
              <Empty t={t} />
            ) : (
              <ul className="divide-y divide-line">
                {(d?.products ?? []).map((p) => (
                  <li key={p.product_id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.name_ar}</div>
                      <div className="font-mono text-[11px] text-muted">{p.sku}</div>
                    </div>
                    <div className="text-end">
                      <div className="font-semibold tabular-nums">{formatSDG(Number(p.revenue_sdg))}</div>
                      <div className="text-[11px] text-muted">
                        {t('qty_sold')}: {formatNumber(p.qty_sold)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            <CardTitle className="mb-3">{t('aged_receivables')}</CardTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(d?.aged ?? []).map((a) => {
                const late = a.bucket !== 'current' && Number(a.amount_sdg) > 0
                return (
                  <div
                    key={a.bucket}
                    className={
                      late
                        ? 'rounded-xl border border-red-200 bg-red-50 p-3'
                        : 'rounded-xl border border-line bg-slate-50 p-3'
                    }
                  >
                    <div className="text-[11px] font-semibold text-muted">
                      {a.bucket === 'current' ? t('is_unpaid') : `${a.bucket} ${t('days')}`}
                    </div>
                    <div
                      className={
                        late
                          ? 'mt-1 text-base font-extrabold text-red-700'
                          : 'mt-1 text-base font-extrabold text-ink'
                      }
                    >
                      {formatSDG(Number(a.amount_sdg))}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formatNumber(a.invoices_count)} {t('invoices_count')}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Empty({ t }: { t: (k: 'no_data') => string }) {
  return <p className="py-8 text-center text-sm text-muted">{t('no_data')}</p>
}
