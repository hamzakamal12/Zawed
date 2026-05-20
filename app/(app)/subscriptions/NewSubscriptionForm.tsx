'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label, Select } from '@/components/ui/Input'
import { FiPlus, FiX } from 'react-icons/fi'

interface ProductLite {
  id: string
  name: string
  sku: string
}

interface LineItem {
  productId: string
  quantity: number
}

export default function NewSubscriptionForm({ products }: { products: ProductLite[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [items, setItems] = useState<LineItem[]>([{ productId: products[0]?.id || '', quantity: 1 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addRow = () =>
    setItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 1 }])

  const update = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || items.length === 0) {
      setError('Please name the subscription and add at least one item.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, frequency, items }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create')
        return
      }
      setName('')
      setItems([{ productId: products[0]?.id || '', quantity: 1 }])
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="subName">Name</Label>
          <Input
            id="subName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Monthly pantry restock"
          />
        </div>
        <div>
          <Label htmlFor="subFreq">Frequency</Label>
          <Select
            id="subFreq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'WEEKLY' | 'MONTHLY')}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </Select>
        </div>
      </div>

      <div>
        <Label>Items</Label>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Select
                value={it.productId}
                onChange={(e) => update(i, { productId: e.target.value })}
                className="flex-1"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.sku}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={it.quantity}
                onChange={(e) => update(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => remove(i)}
                disabled={items.length === 1}
                aria-label="Remove"
              >
                <FiX />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <FiPlus /> Add another item
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save subscription'}
      </Button>
    </form>
  )
}
