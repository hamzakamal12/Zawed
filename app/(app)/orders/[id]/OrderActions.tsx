'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const markPaid = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/orders/${orderId}/mark-paid`, { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="success" onClick={markPaid} disabled={loading}>
      {loading ? 'Updating…' : 'Mark as paid'}
    </Button>
  )
}
