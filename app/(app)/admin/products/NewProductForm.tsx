'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label, Select, Textarea } from '@/components/ui/Input'

interface Category {
  id: string
  name: string
}

export default function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [price, setPrice] = useState(5000)
  const [stock, setStock] = useState(20)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [featured, setFeatured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
          brand,
          description,
          imageUrl,
          categoryId,
          price,
          stock,
          lowStockThreshold,
          featured,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'تعذّر إنشاء المنتج')
        return
      }
      setName('')
      setSku('')
      setBrand('')
      setDescription('')
      setImageUrl('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="newName">اسم المنتج</Label>
          <Input id="newName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="أحمر شفاه مات" />
        </div>
        <div>
          <Label htmlFor="newBrand">الماركة (اختياري)</Label>
          <Input id="newBrand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Maybelline" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="newSku">رمز المنتج (SKU)</Label>
          <Input id="newSku" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="LIP-MAT-01" />
        </div>
        <div>
          <Label htmlFor="cat">الصنف</Label>
          <Select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="newDesc">الوصف (اختياري)</Label>
        <Textarea id="newDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div>
        <Label htmlFor="newImg">رابط الصورة (اختياري)</Label>
        <Input id="newImg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="price">السعر (ج.س)</Label>
          <Input
            id="price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(Math.max(1, parseFloat(e.target.value) || 0))}
          />
        </div>
        <div>
          <Label htmlFor="stock">المخزون</Label>
          <Input
            id="stock"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
        <div>
          <Label htmlFor="threshold">حد التنبيه</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-secondary-700">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        عرض المنتج ضمن المنتجات المميّزة ✨
      </label>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'جارٍ الإضافة…' : 'إضافة المنتج'}
      </Button>
    </form>
  )
}
