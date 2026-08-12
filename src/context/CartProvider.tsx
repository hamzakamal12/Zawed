import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthProvider'

export interface CartLine {
  productId: string
  qty: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  add: (productId: string, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  qtyOf: (productId: string) => number
}

const CartContext = createContext<CartValue | null>(null)

/** Cart is scoped per user so switching accounts never mixes baskets. */
const keyFor = (userId: string | undefined) => `zawed.cart.${userId ?? 'anon'}`

function read(key: string): CartLine[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.productId === 'string' && Number.isFinite(l?.qty) && l.qty > 0,
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const key = keyFor(userId)

  const [lines, setLines] = useState<CartLine[]>(() => read(keyFor(undefined)))

  // Re-read when the signed-in user changes.
  useEffect(() => {
    setLines(read(key))
  }, [key])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(lines))
    } catch {
      /* storage full or blocked — cart stays in memory for this session */
    }
  }, [key, lines])

  const add = useCallback((productId: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l))
      }
      return [...prev, { productId, qty }]
    })
  }, [])

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    )
  }, [])

  const remove = useCallback(
    (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
    [],
  )

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      qtyOf: (productId: string) => lines.find((l) => l.productId === productId)?.qty ?? 0,
    }),
    [lines, add, setQty, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
