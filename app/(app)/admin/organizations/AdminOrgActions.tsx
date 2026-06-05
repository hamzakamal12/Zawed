'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface AdminOrgActionsProps {
  companyId: string
  verified: boolean
  ngoDiscount: number
}

export default function AdminOrgActions({ companyId, verified, ngoDiscount }: AdminOrgActionsProps) {
  const [isVerified, setIsVerified] = useState(verified)
  const [discount, setDiscount] = useState(String(Math.round(ngoDiscount * 100)))
  const [loading, setLoading] = useState(false)
  const [discountLoading, setDiscountLoading] = useState(false)

  const toggleVerify = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${companyId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !isVerified }),
      })
      if (res.ok) setIsVerified(!isVerified)
    } finally {
      setLoading(false)
    }
  }

  const saveDiscount = async () => {
    setDiscountLoading(true)
    try {
      await fetch(`/api/admin/organizations/${companyId}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercent: Number(discount) }),
      })
    } finally {
      setDiscountLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={50}
        value={discount}
        onChange={(e) => setDiscount(e.target.value)}
        className="w-16 border border-secondary-200 rounded px-2 py-1 text-sm text-center"
        title="NGO discount %"
      />
      <span className="text-xs text-secondary-500">%</span>
      <Button size="sm" variant="secondary" onClick={saveDiscount} disabled={discountLoading}>
        {discountLoading ? '…' : 'Set'}
      </Button>
      <Button
        size="sm"
        variant={isVerified ? 'secondary' : 'primary'}
        onClick={toggleVerify}
        disabled={loading}
      >
        {loading ? '…' : isVerified ? 'Unverify' : 'Verify NGO'}
      </Button>
    </div>
  )
}
