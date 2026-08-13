import { useState } from 'react'
import { CheckCircle2, Inbox, XCircle } from 'lucide-react'
import { useDecideApproval, usePendingApprovals } from '@/hooks/documents'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatSDG } from '@/lib/format'
import { Badge, Button, Card, CardBody, EmptyState, Input, Notice, Skeleton } from '@/components/ui'

export default function ApprovalsPage() {
  const { t, pick, lang } = useI18n()
  const pending = usePendingApprovals()
  const decide = useDecideApproval()
  const [comments, setComments] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const act = async (orderId: string, approve: boolean) => {
    setError(null)
    try {
      await decide.mutateAsync({ orderId, approve, comment: comments[orderId] || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  if (pending.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  const rows = pending.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{t('approvals_title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('awaiting_your_approval')}</p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {rows.length === 0 ? (
        <EmptyState icon={<Inbox size={40} />} title={t('approvals_empty')} />
      ) : (
        <div className="space-y-3">
          {rows.map((order) => (
            <Card key={order.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-ink">{order.order_number}</span>
                      <Badge tone="warning">{t('awaiting_your_approval')}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {formatDate(order.created_at, lang)}
                      {order.po_number && <> · PO {order.po_number}</>}
                    </div>
                  </div>
                  <div className="text-lg font-extrabold text-primary-700">
                    {formatSDG(Number(order.total))}
                  </div>
                </div>

                <ul className="divide-y divide-line rounded-lg border border-line">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {item.products ? pick(item.products.name_ar, item.products.name_en) : '—'}
                      </span>
                      <span className="whitespace-nowrap text-muted">
                        {item.qty} × {formatSDG(Number(item.unit_price_snapshot))}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-muted">{order.notes}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="h-9 flex-1 min-w-[180px]"
                    placeholder={t('approval_comment')}
                    value={comments[order.id] ?? ''}
                    onChange={(e) => setComments((c) => ({ ...c, [order.id]: e.target.value }))}
                  />
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => act(order.id, true)}
                    disabled={decide.isPending}
                  >
                    <CheckCircle2 size={15} />
                    {t('approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => act(order.id, false)}
                    disabled={decide.isPending}
                  >
                    <XCircle size={15} />
                    {t('reject')}
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
