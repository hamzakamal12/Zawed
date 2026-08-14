import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { useCart } from '@/context/CartProvider'
import { useAuth } from '@/context/AuthProvider'
import { useOrder, usePlaceOrder } from '@/hooks/queries'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { enqueueOrder } from '@/lib/orderQueue'
import FxAgeNotice from '@/components/FxAgeNotice'
import { useI18n } from '@/i18n/I18nProvider'
import { Button, Card, CardBody, CardTitle, Input, Label, Notice, Textarea } from '@/components/ui'
import { DocumentButton } from '@/components/DocumentButtons'
import { buildOrderDoc } from '@/lib/pdf/orderDoc'

export default function CheckoutPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { lines, clear } = useCart()
  const { company } = useAuth()
  const placeOrder = usePlaceOrder()
  const online = useOnlineStatus()
  const [queued, setQueued] = useState(false)

  const requiresPo = company?.requires_po_number ?? false

  const [address, setAddress] = useState(company?.billing_address ?? '')
  const [date, setDate] = useState('')
  const [po, setPo] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (lines.length === 0 && !placeOrder.isSuccess) {
    return <Navigate to="/cart" replace />
  }

  if (queued) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-status-warning" />
        <h1 className="mt-4 text-xl font-extrabold text-ink">{t('queued_offline')}</h1>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => navigate('/orders')}>{t('orders_title')}</Button>
          <Button variant="outline" onClick={() => navigate('/catalog')}>
            {t('browse_catalog')}
          </Button>
        </div>
      </div>
    )
  }

  if (placeOrder.isSuccess) {
    const result = placeOrder.data
    return (
      <OrderPlaced
        orderId={result.order_id}
        orderNumber={result.order_number}
        onView={() => navigate(`/orders/${result.order_id}`)}
        onBrowse={() => navigate('/catalog')}
      />
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      items: lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
      delivery_address: address.trim(),
      requested_delivery_date: date || null,
      po_number: po.trim() || null,
      notes: notes.trim() || null,
    }

    // Offline: hold the order locally and let the queue send it on reconnect.
    if (!online) {
      enqueueOrder(payload, Number(import.meta.env.VITE_DEFAULT_VAT_PERCENT ?? 0))
      clear()
      setQueued(true)
      return
    }

    try {
      await placeOrder.mutateAsync(payload)
      clear()
    } catch (err) {
      // Postgres raises Arabic messages for business-rule violations
      // (missing PO, stock, min qty) — surface them verbatim.
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-extrabold text-ink">{t('checkout_title')}</h1>

      {/* Told here rather than after the submit fails: the server refuses an
          order on an out-of-date rate, and finding that out only once the
          basket has been filled in is a worse experience than being warned. */}
      <FxAgeNotice compact />

      <Card>
        <CardBody>
          <CardTitle className="mb-4">{t('delivery_details')}</CardTitle>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t('delivery_address')}</Label>
              <Textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('delivery_address_ph')}
              />
            </div>

            <div>
              <Label hint={t('optional')}>{t('requested_date')}</Label>
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label hint={requiresPo ? t('po_required') : t('optional')}>{t('po_number')}</Label>
              <Input
                required={requiresPo}
                value={po}
                onChange={(e) => setPo(e.target.value)}
                placeholder="PO-2026-0001"
                dir="ltr"
              />
            </div>

            <div>
              <Label hint={t('optional')}>{t('notes')}</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* The terms are agreed per company but were never shown back to
                the buyer, who had no way to know whether this was cash on
                delivery or net-30 until the invoice arrived. */}
            {company && (
              <Notice tone="info" icon={<CalendarClock size={16} />}>
                {t('payment_terms')}:{' '}
                {company.payment_terms_days > 0
                  ? t('payment_terms_days', { d: company.payment_terms_days })
                  : t('payment_terms_cash')}
              </Notice>
            )}

            {error && (
              <Notice tone="danger">{error}</Notice>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={placeOrder.isPending}>
              {placeOrder.isPending ? t('placing_order') : t('place_order')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

/**
 * What the buyer sees the moment they submit.
 *
 * The order is not yet a commitment: it is a proforma, and until the company's
 * own approver signs it off the supplier cannot act on it. So this screen
 * hands over the PDF straight away — that document is what gets circulated
 * internally for approval, and asking the buyer to go hunting for it on the
 * order page is how the approval step gets skipped.
 */
function OrderPlaced({
  orderId,
  orderNumber,
  onView,
  onBrowse,
}: {
  orderId: string
  orderNumber: string
  onView: () => void
  onBrowse: () => void
}) {
  const { t, pick } = useI18n()
  const order = useOrder(orderId)
  const awaitingApproval = order.data?.internal_approval === 'pending'

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <CheckCircle2 size={56} className="mx-auto text-status-good" />
      <h1 className="mt-4 text-xl font-extrabold text-ink">
        {awaitingApproval ? t('proforma_raised') : t('order_placed')}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {awaitingApproval ? t('proforma_awaiting_note') : t('order_placed_note')}
      </p>
      <p className="mt-3 font-mono text-lg font-bold text-primary-700">{orderNumber}</p>

      {order.data && (
        <div className="mt-5 flex justify-center">
          <DocumentButton
            kind="proforma"
            size="md"
            build={() => buildOrderDoc(order.data!, 'proforma', pick)}
          />
        </div>
      )}

      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={onView}>{t('view_order')}</Button>
        <Button variant="outline" onClick={onBrowse}>
          {t('browse_catalog')}
        </Button>
      </div>
    </div>
  )
}
