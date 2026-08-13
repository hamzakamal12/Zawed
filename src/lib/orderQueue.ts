import { supabase } from './supabase'
import type { PlaceOrderInput } from '@/hooks/queries'

/**
 * Orders placed while offline are held here and re-sent once the connection
 * returns. The queue lives in localStorage so it survives a reload or the
 * browser being killed mid-outage.
 *
 * Only order submission is queued. Prices are resolved server-side at the
 * moment the order lands, so a queued order is priced at the rate in force
 * when it is finally accepted — never at a stale rate captured offline.
 */

const KEY = 'zawed.order-queue'

export interface QueuedOrder extends PlaceOrderInput {
  queuedAt: string
  vatPercent: number
}

export function readQueue(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: QueuedOrder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage unavailable — the caller surfaces the failure */
  }
}

export function enqueueOrder(input: PlaceOrderInput, vatPercent: number): number {
  const queue = readQueue()
  queue.push({ ...input, vatPercent, queuedAt: new Date().toISOString() })
  writeQueue(queue)
  notify()
  return queue.length
}

export function clearQueue() {
  writeQueue([])
  notify()
}

type Listener = (count: number) => void
const listeners = new Set<Listener>()

function notify() {
  const n = readQueue().length
  for (const l of listeners) l(n)
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener)
  listener(readQueue().length)
  return () => listeners.delete(listener)
}

export interface FlushResult {
  sent: number
  failed: { order: QueuedOrder; reason: string }[]
}

/**
 * Attempts every queued order once. Anything rejected for a business reason
 * (stock gone, missing PO) is dropped from the queue with its reason returned,
 * because retrying it forever would never succeed. Network failures keep the
 * order queued for the next attempt.
 */
export async function flushQueue(): Promise<FlushResult> {
  const queue = readQueue()
  if (queue.length === 0) return { sent: 0, failed: [] }

  const remaining: QueuedOrder[] = []
  const failed: FlushResult['failed'] = []
  let sent = 0

  for (const order of queue) {
    try {
      const { error } = await supabase.rpc('place_order', {
        p_items: order.items,
        p_delivery_address: order.delivery_address,
        p_requested_delivery_date: order.requested_delivery_date,
        p_po_number: order.po_number,
        p_notes: order.notes,
        p_vat_percent: order.vatPercent,
      })
      if (error) {
        // A Postgres error means the server saw and refused it: do not retry.
        failed.push({ order, reason: error.message })
      } else {
        sent += 1
      }
    } catch {
      // Transport failure — still offline, keep it for the next attempt.
      remaining.push(order)
    }
  }

  writeQueue(remaining)
  notify()
  return { sent, failed }
}
