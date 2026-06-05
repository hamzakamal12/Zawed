import type { PriceTier } from '@prisma/client'

export interface PriceTierLite {
  minQty: number
  maxQty: number | null
  unitPrice: number | string
}

/**
 * Resolve the unit price for a given quantity from a list of tiered price breaks.
 * Tiers are matched where minQty <= quantity <= maxQty (maxQty=null means open-ended).
 * Falls back to the lowest tier if no exact match (e.g. qty=0 returns first tier's price).
 */
export function resolveUnitPrice(
  tiers: Array<PriceTier | PriceTierLite>,
  quantity: number,
): number {
  if (!tiers.length) return 0
  const normalized = tiers
    .map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: typeof t.unitPrice === 'string' ? parseFloat(t.unitPrice) : Number(t.unitPrice),
    }))
    .sort((a, b) => a.minQty - b.minQty)

  const match = normalized.find(
    (t) => quantity >= t.minQty && (t.maxQty === null || t.maxQty === undefined || quantity <= t.maxQty),
  )
  if (match) return match.unitPrice
  // quantity below the lowest tier — use the lowest tier price
  if (quantity < normalized[0].minQty) return normalized[0].unitPrice
  // quantity above the highest tier with a maxQty — use the highest tier
  return normalized[normalized.length - 1].unitPrice
}

export function formatTierRange(tier: PriceTierLite | PriceTier): string {
  if (tier.maxQty === null || tier.maxQty === undefined) {
    return `${tier.minQty}+`
  }
  if (tier.minQty === tier.maxQty) return `${tier.minQty}`
  return `${tier.minQty}–${tier.maxQty}`
}
