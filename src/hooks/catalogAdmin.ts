import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadProductImage } from '@/lib/productImage'
import { useAuth } from '@/context/AuthProvider'
import type { Inventory, Product, ProductPrice, ProductUnit } from '@/lib/database.types'

/**
 * Catalog administration.
 *
 * RLS has always allowed an admin to write products, prices and stock — there
 * was simply no screen for it, so the catalog could only be changed by hand in
 * the Supabase dashboard. These hooks are the missing half.
 *
 * Prices are the exception: they are never written directly. product_prices is
 * time-ranged, so repricing means closing the open row and opening a new one,
 * and doing that as two round trips from a phone on 3G can leave a product
 * with two live prices or none. set_product_price() does it in one statement.
 */

export interface ProductAdminRow extends Product {
  /** Cost and margin are staff-only by RLS; customers get null here. */
  price: Pick<ProductPrice, 'cost_usd' | 'margin_percent'> | null
  stock: Pick<Inventory, 'qty_on_hand' | 'qty_reserved' | 'reorder_point'> | null
}

export function useAdminCatalog() {
  const { isStaff } = useAuth()
  return useQuery({
    queryKey: ['admin-catalog'],
    enabled: isStaff,
    queryFn: async (): Promise<ProductAdminRow[]> => {
      const [products, prices, stock] = await Promise.all([
        supabase.from('products').select('*').order('sku'),
        supabase
          .from('product_prices')
          .select('product_id, cost_usd, margin_percent, effective_from, effective_to')
          .order('effective_from', { ascending: false }),
        supabase.from('inventory').select('product_id, qty_on_hand, qty_reserved, reorder_point'),
      ])
      const firstError = products.error || prices.error || stock.error
      if (firstError) throw firstError

      const now = Date.now()
      // Mirror current_cost_usd(): the newest row whose window covers now.
      const livePrice = new Map<string, { cost_usd: number; margin_percent: number }>()
      for (const p of prices.data ?? []) {
        const row = p as unknown as ProductPrice
        const started = new Date(row.effective_from).getTime() <= now
        const open = !row.effective_to || new Date(row.effective_to).getTime() > now
        if (started && open && !livePrice.has(row.product_id)) {
          livePrice.set(row.product_id, {
            cost_usd: Number(row.cost_usd),
            margin_percent: Number(row.margin_percent),
          })
        }
      }
      const stockByProduct = new Map<string, ProductAdminRow['stock']>()
      for (const s of stock.data ?? []) {
        const row = s as unknown as Inventory
        stockByProduct.set(row.product_id, {
          qty_on_hand: row.qty_on_hand,
          qty_reserved: row.qty_reserved,
          reorder_point: row.reorder_point,
        })
      }

      return (products.data ?? []).map((p) => ({
        ...(p as Product),
        price: livePrice.get((p as Product).id) ?? null,
        stock: stockByProduct.get((p as Product).id) ?? null,
      }))
    },
  })
}

export interface ProductDraft {
  id?: string
  sku: string
  name_ar: string
  name_en?: string | null
  category_id?: string | null
  unit: ProductUnit
  units_per_pack: number
  min_order_qty: number
  lead_time_days: number
  description_ar?: string | null
  is_active: boolean
}

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draft: ProductDraft) => {
      const payload = {
        sku: draft.sku.trim(),
        name_ar: draft.name_ar.trim(),
        name_en: draft.name_en?.trim() || null,
        category_id: draft.category_id || null,
        unit: draft.unit,
        units_per_pack: Math.max(1, draft.units_per_pack),
        min_order_qty: Math.max(1, draft.min_order_qty),
        lead_time_days: Math.max(0, draft.lead_time_days),
        description_ar: draft.description_ar?.trim() || null,
        is_active: draft.is_active,
      }
      const q = draft.id
        ? supabase.from('products').update(payload).eq('id', draft.id).select('id').maybeSingle()
        : supabase.from('products').insert(payload).select('id').maybeSingle()
      const { data, error } = await q
      if (error) throw error
      return (data as { id: string } | null)?.id ?? draft.id ?? ''
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useSetProductPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productId: string; costUsd: number; marginPercent: number }) => {
      const { error } = await supabase.rpc('set_product_price', {
        p_product_id: input.productId,
        p_cost_usd: input.costUsd,
        p_margin_percent: input.marginPercent,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      // Every displayed price is derived from this, so drop the lot.
      qc.invalidateQueries({ queryKey: ['catalog-prices'] })
      qc.invalidateQueries({ queryKey: ['price'] })
    },
  })
}

export function useSetStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productId: string; qtyOnHand: number; reorderPoint: number }) => {
      const { error } = await supabase.from('inventory').upsert(
        {
          product_id: input.productId,
          qty_on_hand: Math.max(0, input.qtyOnHand),
          reorder_point: Math.max(0, input.reorderPoint),
        },
        { onConflict: 'product_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; name_ar: string; name_en?: string | null; icon?: string | null }) => {
      const payload = {
        name_ar: input.name_ar.trim(),
        name_en: input.name_en?.trim() || null,
        icon: input.icon || null,
      }
      const q = input.id
        ? supabase.from('categories').update(payload).eq('id', input.id)
        : supabase.from('categories').insert(payload)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

/* ------------------------------------------------------------------ */

/**
 * Attach a photo to a product.
 *
 * The image is downscaled and re-encoded in the browser first — the original
 * off a phone never crosses the network. Upload, then point the row at the new
 * path; doing it in that order means a failed upload leaves the product with
 * its previous picture rather than a path to a file that was never written.
 */
export function useSetProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productId: string; file: File }) => {
      const path = await uploadProductImage(input.productId, input.file)
      const { error } = await supabase
        .from('products')
        .update({ image_path: path })
        .eq('id', input.productId)
      if (error) throw error
      return path
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useRemoveProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productId: string) => {
      // Only clears the reference. The file itself is queued for sweeping by
      // the orphan trigger, so a mis-click stays recoverable until then.
      const { error } = await supabase
        .from('products')
        .update({ image_path: null })
        .eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export interface BulkUploadProgress {
  done: number
  total: number
  failures: { sku: string; message: string }[]
}

/**
 * Uploads a batch of matched photos.
 *
 * Three at a time, not all at once: the compression is CPU work and the
 * upload is bandwidth, and firing fifty of each in parallel on a Sudanese
 * connection makes every one of them slow and some of them time out. Three
 * keeps the pipe busy without collapsing it.
 *
 * A file that fails does not stop the batch — one bad JPEG in fifty should
 * cost you that one, not the run. The failures come back so the operator can
 * see exactly which SKUs still need doing.
 */
export function useBulkProductImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      items: { productId: string; sku: string; file: File }[]
      onProgress?: (p: BulkUploadProgress) => void
    }) => {
      const failures: { sku: string; message: string }[] = []
      let done = 0
      const queue = [...input.items]

      const worker = async () => {
        for (;;) {
          const next = queue.shift()
          if (!next) return
          try {
            const path = await uploadProductImage(next.productId, next.file)
            const { error } = await supabase
              .from('products')
              .update({ image_path: path })
              .eq('id', next.productId)
            if (error) throw new Error(error.message)
          } catch (err) {
            failures.push({
              sku: next.sku,
              message: err instanceof Error ? err.message : 'خطأ غير معروف',
            })
          } finally {
            done += 1
            input.onProgress?.({ done, total: input.items.length, failures: [...failures] })
          }
        }
      }

      await Promise.all([worker(), worker(), worker()])
      return { done, total: input.items.length, failures }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
