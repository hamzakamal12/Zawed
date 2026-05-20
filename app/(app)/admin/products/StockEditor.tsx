'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function StockEditor({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter()
  const [value, setValue] = useState(stock)
  const [saving, setSaving] = useState(false)
  const dirty = value !== stock

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: value }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        className="w-20 h-8"
        value={value}
        onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
      />
      {dirty && (
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? '…' : 'Save'}
        </Button>
      )}
    </div>
  )
}
