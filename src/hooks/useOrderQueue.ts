import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { flushQueue, subscribeQueue, type FlushResult } from '@/lib/orderQueue'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Watches the offline order queue and drains it as soon as the connection
 * returns, so a user who checked out during an outage does not have to
 * remember to resubmit.
 */
export function useOrderQueue() {
  const online = useOnlineStatus()
  const qc = useQueryClient()
  const [count, setCount] = useState(0)
  const [flushing, setFlushing] = useState(false)
  const [lastResult, setLastResult] = useState<FlushResult | null>(null)

  useEffect(() => subscribeQueue(setCount), [])

  useEffect(() => {
    if (!online || count === 0 || flushing) return
    let cancelled = false
    setFlushing(true)
    flushQueue()
      .then((result) => {
        if (cancelled) return
        setLastResult(result)
        if (result.sent > 0) {
          qc.invalidateQueries({ queryKey: ['orders'] })
          qc.invalidateQueries({ queryKey: ['inventory'] })
        }
      })
      .finally(() => {
        if (!cancelled) setFlushing(false)
      })
    return () => {
      cancelled = true
    }
  }, [online, count, flushing, qc])

  return { count, flushing, lastResult }
}
