import { useState } from 'react'
import { Receipt, Wallet } from 'lucide-react'
import { useInvoices, usePayments, useRecordPayment, type InvoiceRow } from '@/hooks/documents'
import { useAuth } from '@/context/AuthProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatSDG } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  Label,
  Select,
  Skeleton,
} from '@/components/ui'
import { DocumentButton } from '@/components/DocumentButtons'
import type { InvoiceStatus, PaymentMethod } from '@/lib/database.types'
import type { DocData } from '@/lib/pdf/documents'
import type { StringKey } from '@/i18n/strings'

const STATUS_KEY: Record<InvoiceStatus, StringKey> = {
  unpaid: 'is_unpaid',
  partially_paid: 'is_partially_paid',
  paid: 'is_paid',
  overdue: 'is_overdue',
}
const STATUS_TONE: Record<InvoiceStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  unpaid: 'neutral',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
}

const METHOD_KEY: Record<PaymentMethod, StringKey> = {
  bank_transfer: 'pm_bank_transfer',
  bankak: 'pm_bankak',
  fawry: 'pm_fawry',
  cash: 'pm_cash',
  cheque: 'pm_cheque',
}

export default function InvoicesPage() {
  const { t } = useI18n()
  const invoices = useInvoices()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('invoices_title')}</h1>

      {invoices.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (invoices.data ?? []).length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title={t('no_invoices')} />
      ) : (
        <div className="space-y-3">
          {(invoices.data ?? []).map((inv) => (
            <InvoiceCard key={inv.id} invoice={inv} />
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceCard({ invoice }: { invoice: InvoiceRow }) {
  const { t, pick, lang } = useI18n()
  const { isStaff } = useAuth()
  const [open, setOpen] = useState(false)
  const payments = usePayments(open ? invoice.id : undefined)
  const record = useRecordPayment()

  const balance = Number(invoice.total) - Number(invoice.amount_paid)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  const buildDoc = (): DocData => ({
    kind: 'invoice',
    number: invoice.invoice_number ?? '—',
    date: invoice.issue_date,
    poNumber: invoice.orders?.po_number ?? null,
    customer: {
      name: invoice.companies ? pick(invoice.companies.name_ar, invoice.companies.name_en) : '—',
      address: invoice.companies?.billing_address ?? null,
      taxId: invoice.companies?.tax_id ?? null,
    },
    // Line detail lives on the order; the invoice document summarises it.
    lines: [
      {
        name: `${t('order_number')} ${invoice.orders?.order_number ?? ''}`,
        sku: invoice.orders?.order_number ?? '',
        qty: 1,
        unitPrice: Number(invoice.total),
        lineTotal: Number(invoice.total),
      },
    ],
    subtotal: Number(invoice.total),
    vatPercent: 0,
    vatAmount: 0,
    total: Number(invoice.total),
  })

  const submitPayment = async () => {
    setError(null)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    try {
      await record.mutateAsync({
        invoiceId: invoice.id,
        amount: value,
        method,
        reference: reference || null,
      })
      setAmount('')
      setReference('')
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
              <span className="font-mono font-bold text-ink">{invoice.invoice_number}</span>
              <Badge tone={STATUS_TONE[invoice.status]}>{t(STATUS_KEY[invoice.status])}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted">
              {invoice.companies ? pick(invoice.companies.name_ar, invoice.companies.name_en) : '—'}
              {' · '}
              {t('issue_date')} {formatDate(invoice.issue_date, lang)}
              {invoice.due_date && <> · {t('due_date')} {formatDate(invoice.due_date, lang)}</>}
            </div>
          </div>
          <div className="text-end">
            <div className="text-lg font-extrabold text-primary-700">
              {formatSDG(Number(invoice.total))}
            </div>
            {balance > 0 && (
              <div className="text-xs text-muted">
                {t('balance')}: {formatSDG(balance)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentButton kind="invoice" build={buildDoc} />
          {isStaff && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
              <Wallet size={14} />
              {t('record_payment')}
            </Button>
          )}
        </div>

        {open && isStaff && (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <Label>{t('payment_amount')}</Label>
                <Input
                  type="number"
                  min={1}
                  dir="ltr"
                  className="h-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(Math.round(balance))}
                />
              </div>
              <div>
                <Label>{t('payment_method')}</Label>
                <Select
                  className="h-9"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  {(Object.keys(METHOD_KEY) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {t(METHOD_KEY[m])}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label hint={t('optional')}>{t('payment_reference')}</Label>
                <Input
                  className="h-9"
                  dir="ltr"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={submitPayment} disabled={record.isPending || balance <= 0}>
                  {record.isPending ? t('loading') : t('save')}
                </Button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

            {(payments.data ?? []).length > 0 && (
              <div>
                <div className="mb-1 text-xs font-bold text-muted">{t('payments_log')}</div>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {(payments.data ?? []).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="text-muted">
                        {formatDate(p.paid_at, lang)} · {t(METHOD_KEY[p.method])}
                        {p.reference_number && ` · ${p.reference_number}`}
                      </span>
                      <span className="font-semibold tabular-nums">{formatSDG(Number(p.amount))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
