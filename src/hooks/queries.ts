import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type {
  Category,
  Company,
  FxRate,
  Inventory,
  Order,
  OrderItem,
  PlaceOrderResult,
  PriceRow,
  Product,
  PriceTier,
} from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 60_000, // categories rarely change
  })
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name_ar', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60_000,
  })
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<Inventory[]> => {
      const { data, error } = await supabase
        .from('inventory')
        .select('product_id, qty_on_hand, qty_reserved, reorder_point, warehouse_location')
      if (error) throw error
      return (data ?? []) as Inventory[]
    },
    staleTime: 60_000,
  })
}

/**
 * Live catalog prices in ONE round trip (get_catalog_prices), instead of
 * calling get_price per product — critical on a 3G link.
 */
export function useCatalogPrices() {
  const { profile } = useAuth()
  const companyId = profile?.company_id ?? null
  return useQuery({
    queryKey: ['catalog-prices', companyId],
    queryFn: async (): Promise<Record<string, PriceRow>> => {
      const { data, error } = await supabase.rpc('get_catalog_prices', {
        p_company_id: companyId,
      })
      if (error) throw error
      const map: Record<string, PriceRow> = {}
      for (const row of (data ?? []) as PriceRow[]) map[row.product_id] = row
      return map
    },
    // FX moves during the day; refetch on focus but keep showing cached values.
    staleTime: 2 * 60_000,
  })
}

/** Exact price for a specific quantity (tier breaks apply). */
export function usePriceForQty(productId: string | undefined, qty: number) {
  const { profile } = useAuth()
  const companyId = profile?.company_id ?? null
  return useQuery({
    queryKey: ['price', productId, companyId, qty],
    enabled: Boolean(productId) && qty > 0,
    queryFn: async (): Promise<PriceRow | null> => {
      const { data, error } = await supabase.rpc('get_price', {
        p_product_id: productId,
        p_company_id: companyId,
        p_qty: qty,
      })
      if (error) throw error
      const rows = (data ?? []) as PriceRow[]
      return rows[0] ?? null
    },
    staleTime: 2 * 60_000,
  })
}

/** Tier table shown on the product page ("order 10 and save 8%"). */
export function useProductTiers(productId: string | undefined) {
  const { profile } = useAuth()
  const companyId = profile?.company_id ?? null
  return useQuery({
    queryKey: ['tiers', productId, companyId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<PriceTier[]> => {
      const { data, error } = await supabase
        .from('price_tiers')
        .select('*')
        .or(`product_id.eq.${productId},product_id.is.null`)
        .order('min_qty', { ascending: true })
      if (error) throw error
      // RLS already hides other companies' tiers; keep global + mine.
      return (data ?? []).filter(
        (t) => t.company_id === null || t.company_id === companyId,
      )
    },
    staleTime: 10 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/* FX rate                                                             */
/* ------------------------------------------------------------------ */

export function useCurrentFx() {
  return useQuery({
    queryKey: ['fx-current'],
    queryFn: async (): Promise<FxRate | null> => {
      const { data, error } = await supabase
        .from('fx_rates')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
    staleTime: 60_000,
  })
}

export function useFxHistory(limit = 10) {
  return useQuery({
    queryKey: ['fx-history', limit],
    queryFn: async (): Promise<FxRate[]> => {
      const { data, error } = await supabase
        .from('fx_rates')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSetFxRate() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { rate: number; source: FxRate['source'] }) => {
      const { error } = await supabase.from('fx_rates').insert({
        rate_sdg_per_usd: input.rate,
        source: input.source,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      // Every price in the app derives from this rate.
      qc.invalidateQueries({ queryKey: ['fx-current'] })
      qc.invalidateQueries({ queryKey: ['fx-history'] })
      qc.invalidateQueries({ queryKey: ['catalog-prices'] })
      qc.invalidateQueries({ queryKey: ['price'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export interface OrderWithItems extends Order {
  companies?: Pick<Company, 'name_ar' | 'name_en' | 'tax_id' | 'billing_address'> | null
  order_items: (OrderItem & { products: Pick<Product, 'name_ar' | 'name_en' | 'sku' | 'unit'> | null })[]
}

export function useMyOrders() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['orders', session?.user?.id],
    enabled: Boolean(session),
    queryFn: async (): Promise<OrderWithItems[]> => {
      // RLS scopes this to the caller's company automatically.
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name_ar, name_en, sku, unit))')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as unknown as OrderWithItems[]
    },
  })
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: Boolean(orderId),
    queryFn: async (): Promise<OrderWithItems | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          '*, companies(name_ar, name_en, tax_id, billing_address), order_items(*, products(name_ar, name_en, sku, unit))',
        )
        .eq('id', orderId!)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as unknown as OrderWithItems | null
    },
  })
}

export interface PlaceOrderInput {
  items: { product_id: string; qty: number }[]
  delivery_address: string
  requested_delivery_date: string | null
  po_number: string | null
  notes: string | null
}

/**
 * Creates the order through the server-side RPC. Line prices are resolved
 * by Postgres from get_price() — the client never supplies a price.
 */
export function usePlaceOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PlaceOrderInput): Promise<PlaceOrderResult> => {
      const { data, error } = await supabase.rpc('place_order', {
        p_items: input.items,
        p_delivery_address: input.delivery_address,
        p_requested_delivery_date: input.requested_delivery_date,
        p_po_number: input.po_number,
        p_notes: input.notes,
        p_vat_percent: Number(import.meta.env.VITE_DEFAULT_VAT_PERCENT ?? 0),
      })
      if (error) throw error
      const rows = (data ?? []) as PlaceOrderResult[]
      if (!rows[0]) throw new Error('order failed')
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export interface AdminOrderRow extends Order {
  companies: { name_ar: string; name_en: string | null } | null
  order_items: { id: string }[]
}

export function useAdminOrders(status: Order['status'] | 'all') {
  return useQuery({
    queryKey: ['admin-orders', status],
    queryFn: async (): Promise<AdminOrderRow[]> => {
      let q = supabase
        .from('orders')
        .select('*, companies(name_ar, name_en), order_items(id)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as AdminOrderRow[]
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { orderId: string; status: Order['status'] }) => {
      const { error } = await supabase
        .from('orders')
        .update({
          status: input.status,
          delivered_at: input.status === 'delivered' ? new Date().toISOString() : null,
        })
        .eq('id', input.orderId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order'] })
    },
  })
}
