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
  // Mirrored from auth.users so a staff member can tell which login a row is;
  // written by the invite-user function, never editable by the account holder.
  email: string | null
  created_at: string
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
  /** Path inside the product-images bucket, not a URL — see migration 16. */
  image_path: string | null
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
  quotation_id: string | null
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
  approved_by: string | null
  internal_approval: InternalApproval
  approval_comment: string | null
  approved_at: string | null
  notes: string | null
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

export type InternalApproval = 'not_required' | 'pending' | 'approved' | 'rejected'
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue'
export type PaymentMethod = 'bank_transfer' | 'bankak' | 'fawry' | 'cash' | 'cheque'
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly'

export interface Quotation {
  id: string
  quote_number: string | null
  company_id: string
  created_by: string | null
  status: QuotationStatus
  currency: CurrencyCode
  fx_rate_snapshot: number | null
  valid_until: string
  subtotal: number
  vat_percent: number
  vat_amount: number
  total: number
  notes_ar: string | null
  terms_ar: string | null
  converted_order_id: string | null
  created_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string
  qty: number
  unit_price_snapshot: number
  line_total: number
}

export interface Invoice {
  id: string
  invoice_number: string | null
  order_id: string
  company_id: string
  issue_date: string
  due_date: string | null
  currency: CurrencyCode
  total: number
  amount_paid: number
  status: InvoiceStatus
  pdf_url: string | null
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: CurrencyCode
  method: PaymentMethod
  reference_number: string | null
  recorded_by: string | null
  paid_at: string
}

export interface RecurringOrder {
  id: string
  company_id: string
  name: string
  frequency: RecurringFrequency
  next_run_date: string | null
  is_active: boolean
  items: { product_id: string; qty: number }[]
  last_run_at: string | null
  last_order_id: string | null
  created_at: string
}

/** Row shape of get_price() / get_catalog_prices(). */
export type QuoteRequestStatus =
  | 'submitted'
  | 'in_review'
  | 'quoted'
  | 'declined'
  | 'cancelled'

export interface QuoteRequest {
  id: string
  request_number: string | null
  company_id: string
  created_by: string | null
  status: QuoteRequestStatus
  notes: string | null
  needed_by: string | null
  quotation_id: string | null
  decline_reason: string | null
  created_at: string
}

export interface QuoteRequestItem {
  id: string
  request_id: string
  /** Null for an off-catalog ask, where `description` carries the request. */
  product_id: string | null
  description: string | null
  qty: number
  note: string | null
}

export interface QuoteRequestResult {
  request_id: string
  request_number: string
}

export type AccountRequestStatus = 'new' | 'contacted' | 'approved' | 'rejected'

export interface AccountRequest {
  id: string
  company_name: string
  company_type: CompanyType
  contact_name: string
  email: string
  phone: string | null
  city: string | null
  tax_id: string | null
  notes: string | null
  status: AccountRequestStatus
  company_id: string | null
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface ProductPrice {
  id: string
  product_id: string
  cost_usd: number
  margin_percent: number
  effective_from: string
  effective_to: string | null
}

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
      product_prices: { Row: ProductPrice; Insert: Partial<ProductPrice>; Update: Partial<ProductPrice> }
      price_tiers: { Row: PriceTier; Insert: Partial<PriceTier>; Update: Partial<PriceTier> }
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> }
      quotations: { Row: Quotation; Insert: Partial<Quotation>; Update: Partial<Quotation> }
      quotation_items: { Row: QuotationItem; Insert: Partial<QuotationItem>; Update: Partial<QuotationItem> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      recurring_orders: { Row: RecurringOrder; Insert: Partial<RecurringOrder>; Update: Partial<RecurringOrder> }
      quote_requests: { Row: QuoteRequest; Insert: Partial<QuoteRequest>; Update: Partial<QuoteRequest> }
      quote_request_items: { Row: QuoteRequestItem; Insert: Partial<QuoteRequestItem>; Update: Partial<QuoteRequestItem> }
      account_requests: { Row: AccountRequest; Insert: Partial<AccountRequest>; Update: Partial<AccountRequest> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
