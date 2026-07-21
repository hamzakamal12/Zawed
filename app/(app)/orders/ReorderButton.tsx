'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { FiRefreshCw } from 'react-icons/fi'

export default function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const onClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: 'POST' })
      if (res.ok) router.push('/cart')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      <FiRefreshCw /> <span className="hidden sm:inline">{loading ? 'جارٍ…' : 'إعادة الطلب'}</span>
    </Button>
  )
}
