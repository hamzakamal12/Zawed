import { prisma } from './db'
import { resolveUnitPrice } from './pricing'

/**
 * Get-or-create the active cart for a user. Each user has at most one ACTIVE cart at a time.
 */
export async function getOrCreateActiveCart(userId: string, companyId: string) {
  const existing = await prisma.cart.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing
  return prisma.cart.create({
    data: { userId, companyId, status: 'ACTIVE' },
  })
}

export interface CartLineComputed {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  taxRate: number
  subtotal: number
  taxAmount: number
  lineTotal: number
  stock: number
  lowStockThreshold: number
}

export interface CartTotals {
  subtotal: number
  discountAmount: number
  discountedSubtotal: number
  taxAmount: number
  totalAmount: number
}

/**
 * Re-resolve unit prices for every item from current price tiers, then compute totals.
 * ngoDiscountRate is a decimal ratio (e.g. 0.10 = 10%) applied to verified NGO companies.
 */
export async function computeCart(cartId: string, ngoDiscountRate = 0): Promise<{
  lines: CartLineComputed[]
  totals: CartTotals
}> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: { include: { priceTiers: { orderBy: { minQty: 'asc' } } } },
    },
  })

  const lines: CartLineComputed[] = items.map((item) => {
    const tiers = item.product.priceTiers.map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: t.unitPrice.toString(),
    }))
    const unitPrice = resolveUnitPrice(tiers, item.quantity)
    const taxRate = Number(item.product.taxRate)
    const subtotal = unitPrice * item.quantity
    const taxAmount = subtotal * taxRate
    return {
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      quantity: item.quantity,
      unitPrice,
      taxRate,
      subtotal,
      taxAmount,
      lineTotal: subtotal + taxAmount,
      stock: item.product.stock,
      lowStockThreshold: item.product.lowStockThreshold,
    }
  })

  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const rawTaxAmount = lines.reduce((s, l) => s + l.taxAmount, 0)

  // NGO discount reduces the pre-tax subtotal; tax is re-computed on the discounted amount.
  const discountAmount = subtotal * ngoDiscountRate
  const discountedSubtotal = subtotal - discountAmount
  const taxAmount = rawTaxAmount * (1 - ngoDiscountRate)

  return {
    lines,
    totals: {
      subtotal,
      discountAmount,
      discountedSubtotal,
      taxAmount,
      totalAmount: discountedSubtotal + taxAmount,
    },
  }
}
