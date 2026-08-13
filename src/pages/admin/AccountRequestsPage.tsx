import { useState } from 'react'
import { Building2, CheckCircle2, Inbox, XCircle } from 'lucide-react'
import {
  useAccountRequests,
  useApproveAccountRequest,
  useDecideAccountRequest,
} from '@/hooks/documents'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  Label,
  Notice,
  Skeleton,
} from '@/components/ui'
import type { AccountRequest, AccountRequestStatus } from '@/lib/database.types'
import type { StringKey } from '@/i18n/strings'

const STATUS_KEY: Record<AccountRequestStatus, StringKey> = {
  new: 'ar_new',
  contacted: 'ar_contacted',
  approved: 'ar_approved',
  rejected: 'ar_rejected',
}
const STATUS_TONE: Record<AccountRequestStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'warning',
  approved: 'success',
  rejected: 'danger',
}
const TYPE_KEY: Record<string, StringKey> = {
  ngo: 'ct_ngo',
  corporate: 'ct_corporate',
  government: 'ct_government',
  sme: 'ct_sme',
}

/**
 * The queue behind the public sign-up form.
 *
 * Approving creates the company record. It deliberately stops there: creating
 * the actual login user needs the auth admin API and a service-role key, which
 * must never reach a browser, so the screen says plainly what the operator has
 * to do next rather than pretending the account is ready.
 */
export default function AccountRequestsPage() {
  const { t } = useI18n()
  const requests = useAccountRequests()
  const [showClosed, setShowClosed] = useState(false)

  if (requests.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  const all = requests.data ?? []
  const open = all.filter((r) => r.status === 'new' || r.status === 'contacted')
  const closed = all.filter((r) => r.status === 'approved' || r.status === 'rejected')
  const shown = showClosed ? closed : open

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('ar_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('ar_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showClosed ? 'outline' : 'primary'} size="sm" onClick={() => setShowClosed(false)}>
            {t('ar_open')} ({open.length})
          </Button>
          <Button variant={showClosed ? 'primary' : 'outline'} size="sm" onClick={() => setShowClosed(true)}>
            {t('ar_closed')} ({closed.length})
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Inbox size={30} />} title={t('ar_empty')} />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ request }: { request: AccountRequest }) {
  const { t, lang } = useI18n()
  const approve = useApproveAccountRequest()
  const decide = useDecideAccountRequest()
  const [terms, setTerms] = useState('30')
  const [requiresPo, setRequiresPo] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)

  const isOpen = request.status === 'new' || request.status === 'contacted'

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink" dir="auto">
                {request.company_name}
              </span>
              <Badge tone={STATUS_TONE[request.status]}>{t(STATUS_KEY[request.status])}</Badge>
              <Badge tone="neutral">{t(TYPE_KEY[request.company_type] ?? 'ct_sme')}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted">
              <span dir="auto">{request.contact_name}</span> ·{' '}
              <span dir="ltr">{request.email}</span>
              {request.phone && (
                <>
                  {' · '}
                  <span dir="ltr">{request.phone}</span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {formatDate(request.created_at, lang)}
              {request.city && <> · {request.city}</>}
              {request.tax_id && (
                <>
                  {' · '}
                  {t('tax_id')} <span dir="ltr">{request.tax_id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {request.notes && (
          <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-muted">{request.notes}</p>
        )}

        {isOpen && (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <Label>{t('ar_terms_days')}</Label>
                <Input
                  type="number"
                  min="0"
                  dir="ltr"
                  className="h-9"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>
              <label className="flex h-9 items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={requiresPo}
                  onChange={(e) => setRequiresPo(e.target.checked)}
                  className="h-4 w-4 accent-[#0a6d74]"
                />
                {t('ar_requires_po')}
              </label>
              <div className="min-w-[180px] flex-1">
                <Label hint={t('optional')}>{t('ar_note')}</Label>
                <Input className="h-9" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                size="sm"
                disabled={approve.isPending}
                onClick={() =>
                  run(async () => {
                    const res = await approve.mutateAsync({
                      requestId: request.id,
                      paymentTermsDays: Number(terms) || 30,
                      requiresPo,
                      note: note || null,
                    })
                    setCreated(res.company_name)
                  })
                }
              >
                <Building2 size={15} />
                {t('ar_approve')}
              </Button>
              {request.status === 'new' && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() =>
                    run(() =>
                      decide.mutateAsync({
                        requestId: request.id,
                        status: 'contacted',
                        note: note || null,
                      }),
                    )
                  }
                >
                  <CheckCircle2 size={15} />
                  {t('ar_mark_contacted')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={decide.isPending}
                onClick={() =>
                  run(() =>
                    decide.mutateAsync({
                      requestId: request.id,
                      status: 'rejected',
                      note: note || null,
                    }),
                  )
                }
              >
                <XCircle size={15} />
                {t('reject')}
              </Button>
            </div>
          </div>
        )}

        {created && (
          <Notice tone="success">
            {t('ar_company_created', { name: created })}
            <div className="mt-1 font-normal">{t('ar_next_step')}</div>
          </Notice>
        )}
        {request.review_note && !isOpen && (
          <Notice tone={request.status === 'approved' ? 'success' : 'danger'}>
            {request.review_note}
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </CardBody>
    </Card>
  )
}
