'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export default function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const setStatus = async (next: string) => {
    setLoading(next)
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="bg-secondary-50">
      <CardContent className="p-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-secondary-600 me-2">إجراءات المدير:</span>
        {status !== 'CONFIRMED' && status !== 'DELIVERED' && (
          <Button size="sm" onClick={() => setStatus('CONFIRMED')} disabled={loading !== null}>
            {loading === 'CONFIRMED' ? '…' : 'تأكيد الطلب'}
          </Button>
        )}
        {status !== 'DELIVERED' && (
          <Button variant="success" size="sm" onClick={() => setStatus('DELIVERED')} disabled={loading !== null}>
            {loading === 'DELIVERED' ? '…' : 'تم التوصيل والدفع'}
          </Button>
        )}
        {status !== 'CANCELLED' && status !== 'DELIVERED' && (
          <Button variant="danger" size="sm" onClick={() => setStatus('CANCELLED')} disabled={loading !== null}>
            {loading === 'CANCELLED' ? '…' : 'إلغاء'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
