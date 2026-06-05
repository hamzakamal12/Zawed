'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label, Select, Textarea } from '@/components/ui/Input'
import { FiPlus, FiX } from 'react-icons/fi'

interface Category {
  id: string
  name: string
}

interface Tier {
  minQty: number
  maxQty: number | null
  unitPrice: number
}

export default function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [stock, setStock] = useState(100)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [taxRate, setTaxRate] = useState(0.05)
  const [tiers, setTiers] = useState<Tier[]>([
    { minQty: 1, maxQty: 10, unitPrice: 10 },
    { minQty: 11, maxQty: 50, unitPrice: 8.5 },
    { minQty: 51, maxQty: null, unitPrice: 7 },
  ])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const updateTier = (i: number, patch: Partial<Tier>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))

  const addTier = () =>
    setTiers((prev) => {
      const last = prev[prev.length - 1]
      return [...prev, { minQty: (last?.maxQty || last?.minQty || 0) + 1, maxQty: null, unitPrice: 1 }]
    })

  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sku,
          description,
          categoryId,
          stock,
          lowStockThreshold,
          taxRate,
          tiers,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create product')
        return
      }
      setName('')
      setSku('')
      setDescription('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="newName">Name</Label>
          <Input
            id="newName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Premium Arabica Coffee — 1kg"
          />
        </div>
        <div>
          <Label htmlFor="newSku">SKU</Label>
          <Input
            id="newSku"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="COF-AR-1KG"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="newDesc">Description (optional)</Label>
        <Textarea
          id="newDesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <Label htmlFor="cat">Category</Label>
          <Select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
        <div>
          <Label htmlFor="threshold">Low stock threshold</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
        <div>
          <Label htmlFor="tax">Tax rate</Label>
          <Input
            id="tax"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={taxRate}
            onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
          />
        </div>
      </div>

      <div>
        <Label>Tiered pricing</Label>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                type="number"
                min={1}
                className="w-24"
                value={t.minQty}
                onChange={(e) =>
                  updateTier(i, { minQty: Math.max(1, parseInt(e.target.value) || 1) })
                }
                placeholder="Min qty"
              />
              <span className="text-secondary-500 text-sm">to</span>
              <Input
                type="number"
                min={0}
                className="w-24"
                value={t.maxQty ?? ''}
                onChange={(e) =>
                  updateTier(i, { maxQty: e.target.value === '' ? null : parseInt(e.target.value) })
                }
                placeholder="∞"
              />
              <span className="text-secondary-500 text-sm">@</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="w-32"
                value={t.unitPrice}
                onChange={(e) =>
                  updateTier(i, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })
                }
                placeholder="Unit price"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeTier(i)}
                disabled={tiers.length === 1}
              >
                <FiX />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTier}>
            <FiPlus /> Add tier
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create product'}
      </Button>
    </form>
  )
}
