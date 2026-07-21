'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { type PriceTierLite } from '@/lib/pricing'
import { FiTrash2 } from 'react-icons/fi'

interface Line {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  stock: number
  emoji: string | null
  tiers: PriceTierLite[]
  unitPrice: number
  subtotal: number
  taxRate: number
  taxAmount: number
}

export default function CartLines({ items }: { cartId: string; items: Line[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState<string | null>(null)

  const updateQty = async (id: string, qty: number) => {
    setPending(id)
    try {
      await fetch('/api/cart/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId: id, quantity: qty }),
      })
      startTransition(() => router.refresh())
    } finally {
      setPending(null)
    }
  }

  const remove = async (id: string) => {
    setPending(id)
    try {
      await fetch('/api/cart/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId: id }),
      })
      startTransition(() => router.refresh())
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-secondary-100">
          {items.map((item) => {
            const overStock = item.quantity > item.stock
            return (
              <li key={item.id} className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0">
                    {item.emoji ?? '💄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-secondary-900">{item.productName}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="default">{formatCurrency(item.unitPrice)} / القطعة</Badge>
                      {overStock && <Badge variant="danger">يتجاوز المتوفر ({item.stock})</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center rounded-md border border-secondary-300 overflow-hidden">
                      <button
                        type="button"
                        className="w-8 h-8 hover:bg-secondary-50 disabled:opacity-50"
                        disabled={item.quantity <= 1 || pending === item.id}
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQty(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center text-sm border-0 focus:outline-none"
                        disabled={pending === item.id}
                      />
                      <button
                        type="button"
                        className="w-8 h-8 hover:bg-secondary-50"
                        disabled={pending === item.id}
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={pending === item.id}
                      className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                    >
                      <FiTrash2 /> حذف
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
