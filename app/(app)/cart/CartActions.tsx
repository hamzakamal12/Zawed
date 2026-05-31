'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function CartActions({
  cartId,
  canSubmit,
  canApprove,
  canCheckout,
  isStaff,
}: {
  cartId: string
  canSubmit: boolean
  canApprove: boolean
  canCheckout: boolean
  isStaff: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cart/submit', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to submit')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cart/${cartId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to approve')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const checkout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cart/${cartId}/checkout`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Checkout failed')
        return
      }
      router.push(`/orders/${data.orderId}?placed=1`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 pt-2">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {isStaff && canSubmit && (
        <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
          {loading ? 'Submitting…' : 'Submit for approval'}
        </Button>
      )}
      {canApprove && (
        <Button
          className="w-full"
          variant="success"
          size="lg"
          onClick={approve}
          disabled={loading}
        >
          {loading ? 'Approving…' : 'Approve cart'}
        </Button>
      )}
      {canCheckout && (
        <Button className="w-full" size="lg" onClick={checkout} disabled={loading}>
          {loading ? 'Placing order…' : 'Checkout (Cash on Delivery)'}
        </Button>
      )}
    </div>
  )
}
