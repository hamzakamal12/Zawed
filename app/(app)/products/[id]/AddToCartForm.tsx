'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { resolveUnitPrice, type PriceTierLite } from '@/lib/pricing'
import { FiShoppingBag, FiCheck } from 'react-icons/fi'

export default function AddToCartForm({
  productId,
  tiers,
  stock,
}: {
  productId: string
  tiers: PriceTierLite[]
  stock: number
}) {
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unitPrice = resolveUnitPrice(tiers, qty)
  const total = unitPrice * qty

  const addToCart = async () => {
    setLoading(true)
    setError(null)
    setAdded(false)
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'تعذّرت الإضافة للسلة')
      } else {
        setAdded(true)
        router.refresh()
      }
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-secondary-300 overflow-hidden">
          <button
            type="button"
            className="w-9 h-10 flex items-center justify-center hover:bg-secondary-50 disabled:opacity-50"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 border-0 text-center focus:ring-0 rounded-none"
          />
          <button
            type="button"
            className="w-9 h-10 flex items-center justify-center hover:bg-secondary-50"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>
        <div className="flex-1">
          <div className="text-xs text-secondary-500">الإجمالي</div>
          <div className="text-lg font-bold text-primary-600 tabular-nums">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      <Button
        className="w-full mt-4"
        size="lg"
        onClick={addToCart}
        disabled={loading || stock === 0 || added}
      >
        {added ? (
          <>
            <FiCheck /> تمت الإضافة
          </>
        ) : loading ? (
          'جارٍ الإضافة…'
        ) : stock === 0 ? (
          'نفذت الكمية'
        ) : (
          <>
            <FiShoppingBag /> أضيفي إلى السلة
          </>
        )}
      </Button>

      {added && (
        <Link href="/cart" className="block text-center mt-3 text-sm text-primary-600 hover:underline">
          الذهاب إلى السلة ←
        </Link>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
