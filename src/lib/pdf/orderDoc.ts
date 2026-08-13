import type { DocData, DocKind } from './documents'
import type { OrderWithItems } from '@/hooks/queries'

/**
 * Maps an order onto a printable document.
 *
 * Shared because three screens now raise the same proforma from the same
 * order — checkout, the approvals inbox, and the order page — and a divergence
 * between them would mean the document an official approves is not the one the
 * buyer saw.
 */
export function buildOrderDoc(
  order: OrderWithItems,
  kind: DocKind,
  pick: (ar: string | null | undefined, en: string | null | undefined) => string,
  number?: string,
): DocData {
  return {
    kind,
    number: number ?? order.order_number ?? '—',
    date: order.created_at,
    poNumber: order.po_number,
    customer: {
      name: order.companies ? pick(order.companies.name_ar, order.companies.name_en) : '—',
      address: order.delivery_address,
      taxId: order.companies?.tax_id ?? null,
    },
    lines: order.order_items.map((i) => ({
      name: i.products ? pick(i.products.name_ar, i.products.name_en) : '—',
      sku: i.products?.sku ?? '',
      qty: i.qty,
      unitPrice: Number(i.unit_price_snapshot),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(order.subtotal),
    vatAmount: Number(order.vat_amount),
    total: Number(order.total),
    fxRate: order.fx_rate_snapshot,
    notes: order.notes,
  }
}
