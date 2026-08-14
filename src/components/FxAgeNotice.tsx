import { AlertTriangle, Ban } from 'lucide-react'
import { useFxStatus } from '@/hooks/queries'
import { useI18n } from '@/i18n/I18nProvider'
import { Notice } from './ui'

/**
 * How old the exchange rate is, and what that means right now.
 *
 * Every price on this platform is cost × margin × fx, so a rate nobody has
 * refreshed is not a display problem — it sells below cost on every line. The
 * age, the thresholds and the verdict all come from fx_status(), which is the
 * same function that backs the server-side refusal. That matters: a screen
 * computing its own "stale after 24h" could show a reassuring green while the
 * server was about to reject the order.
 *
 * Renders nothing while the rate is fresh, so it can sit on any screen.
 */
export default function FxAgeNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const fx = useFxStatus()
  const s = fx.data
  if (!s || (!s.is_stale && !s.is_expired)) return null

  const hours = Math.floor(s.age_hours ?? 0)
  const days = Math.floor(hours / 24)

  if (s.is_expired) {
    return (
      <Notice tone="danger" icon={<Ban size={18} />}>
        {s.rate == null
          ? t('fx_none_set')
          : t(compact ? 'fx_expired_short' : 'fx_expired', { h: hours, d: days })}
      </Notice>
    )
  }

  return (
    <Notice tone="warning" icon={<AlertTriangle size={18} />}>
      {t('fx_stale', { h: hours })}
    </Notice>
  )
}
