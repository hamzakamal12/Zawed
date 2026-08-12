import { Badge } from './ui'
import { useI18n } from '@/i18n/I18nProvider'
import type { OrderStatus } from '@/lib/database.types'
import type { StringKey } from '@/i18n/strings'

const TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending_approval: 'warning',
  confirmed: 'info',
  picking: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'danger',
}

const KEY: Record<OrderStatus, StringKey> = {
  pending_approval: 'st_pending_approval',
  confirmed: 'st_confirmed',
  picking: 'st_picking',
  out_for_delivery: 'st_out_for_delivery',
  delivered: 'st_delivered',
  cancelled: 'st_cancelled',
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending_approval',
  'confirmed',
  'picking',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

export function useStatusLabel() {
  const { t } = useI18n()
  return (status: OrderStatus) => t(KEY[status])
}

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const label = useStatusLabel()
  return <Badge tone={TONE[status]}>{label(status)}</Badge>
}
