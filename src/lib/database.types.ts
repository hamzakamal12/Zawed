/**
 * Hand-maintained mirror of supabase/migrations. Regenerate with:
 *   supabase gen types typescript --linked > src/lib/database.types.ts
 */

export type UserRole =
  | 'admin'
  | 'sales'
  | 'warehouse'
  | 'customer_admin'
  | 'customer_requester'

export type CompanyType = 'ngo' | 'corporate' | 'government' | 'sme'
export type CurrencyCode = 'SDG' | 'USD'
export type ProductUnit = 'piece' | 'box' | 'ream' | 'carton' | 'kg' | 'liter'
export type FxSource = 'manual' | 'parallel_market' | 'central_bank'
export type OrderStatus =
  | 'pending_approval'
  | 'confirmed'
  | 'picking'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface Company {
  id: string
  name_ar: string
  name_en: string | null
  type: CompanyType
  tax_id: string | null
  billing_address: string | null
  default_currency: CurrencyCode
  payment_terms_days: number
  credit_limit: number
  requires_po_number: boolean
  is_active: boolean
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
  company_id: string | null
  is_active: boolean
}

export interface Category {
  id: string
  name_ar: string
  name_en: string | null
  sort_order: number
  icon: string | null
}

export interface Product {
  id: string
  sku: string
  name_ar: string
  name_en: string | null
  category_id: string | null
  unit: ProductUnit
  units_per_pack: number
  image_url: string | null
  description_ar: string | null
  is_active: boolean
  min_order_qty: number
  lead_time_days: number
}

export interface Inventory {
  product_id: string
  qty_on_hand: number
  qty_reserved: number
  reorder_point: number
  warehouse_location: string | null
}

export interface FxRate {
  id: string
  rate_sdg_per_usd: number
  source: FxSource
  effective_from: string
  created_at: string
}

export interface PriceTier {
  id: string
  company_id: string | null
  product_id: string | null
  min_qty: number
  discount_percent: number
}

export interface Order {
  id: string
  order_number: string | null
  company_id: string
  po_number: string | null
  status: OrderStatus
  currency: CurrencyCode
  fx_rate_snapshot: number | null
  subtotal: number
  vat_amount: number
  total: number
  delivery_address: string | null
  requested_delivery_date: string | null
  delivered_at: string | null
  created_by: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  qty: number
  unit_price_snapshot: number
  line_total: number
  qty_delivered: number
}

/** Row shape of get_price() / get_catalog_prices(). */
export interface PriceRow {
  product_id: string
  unit_price_sdg: number | null
  unit_price_usd: number | null
  fx_rate_used: number | null
  discount_applied: number
  tier_name: string
}

export interface PlaceOrderResult {
  order_id: string
  order_number: string
  total: number
}

/** Minimal Database generic so supabase-js infers table row types. */
export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> }
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      inventory: { Row: Inventory; Insert: Partial<Inventory>; Update: Partial<Inventory> }
      fx_rates: { Row: FxRate; Insert: Partial<FxRate>; Update: Partial<FxRate> }
      price_tiers: { Row: PriceTier; Insert: Partial<PriceTier>; Update: Partial<PriceTier> }
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
