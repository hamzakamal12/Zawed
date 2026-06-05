'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { FiCheckCircle, FiFileText, FiDownload } from 'react-icons/fi'

export default function AdminOrderActions({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string
  orderNumber: string
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const markPaid = async () => {
    if (!confirm(`تأكيد استلام الدفع للطلب ${orderNumber}؟`)) return
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}/mark-paid`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <a href={`/api/orders/${orderId}/invoice?type=proforma`} target="_blank" rel="noreferrer">
        <Button variant="ghost" size="sm" className="text-secondary-500 hover:text-secondary-700">
          <FiFileText className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">مبدئية</span>
        </Button>
      </a>
      {status === 'PAID' && (
        <a href={`/api/orders/${orderId}/invoice`} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
            <FiDownload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">فاتورة</span>
          </Button>
        </a>
      )}
      {status === 'PENDING_PAYMENT' && (
        <Button
          size="sm"
          onClick={markPaid}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white from-emerald-600 to-emerald-700"
        >
          <FiCheckCircle className="w-3.5 h-3.5" />
          {loading ? '...' : 'تأكيد الدفع'}
        </Button>
      )}
    </div>
  )
}
