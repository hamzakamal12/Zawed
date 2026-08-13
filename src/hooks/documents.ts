import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type {
  Company,
  Invoice,
  Order,
  Payment,
  PaymentMethod,
  Quotation,
  QuotationItem,
  RecurringOrder,
  Product,
  QuoteRequest,
  QuoteRequestItem,
  QuoteRequestResult,
} from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/* Companies (staff pick a customer when quoting)                      */
/* ------------------------------------------------------------------ */

export function useCompanies() {
  const { isStaff } = useAuth()
  return useQuery({
    queryKey: ['companies'],
    enabled: isStaff,
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name_ar')
      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/* Quotations                                                          */
/* ------------------------------------------------------------------ */

export interface QuotationWithItems extends Quotation {
  companies: Pick<Company, 'name_ar' | 'name_en' | 'billing_address' | 'tax_id'> | null
  quotation_items: (QuotationItem & {
    products: Pick<Product, 'name_ar' | 'name_en' | 'sku'> | null
  })[]
}

export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async (): Promise<QuotationWithItems[]> => {
      // Lapse anything past its validity before listing.
      await supabase.rpc('expire_quotations')
      const { data, error } = await supabase
        .from('quotations')
        .select(
          '*, companies(name_ar, name_en, billing_address, tax_id), quotation_items(*, products(name_ar, name_en, sku))',
        )
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as unknown as QuotationWithItems[]
    },
  })
}

export interface CreateQuotationInput {
  companyId: string
  items: { product_id: string; qty: number }[]
  notes?: string | null
  terms?: string | null
  vatPercent?: number
  validityDays?: number
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateQuotationInput) => {
      const { data, error } = await supabase.rpc('create_quotation', {
        p_company_id: input.companyId,
        p_items: input.items,
        p_notes: input.notes ?? null,
        p_terms: input.terms ?? null,
        p_vat_percent: input.vatPercent ?? 0,
        p_validity_days: input.validityDays ?? 7,
      })
      if (error) throw error
      const rows = (data ?? []) as { quotation_id: string; quote_number: string; total: number }[]
      if (!rows[0]) throw new Error('quotation failed')
      return rows[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

export function useAcceptQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { quotationId: string; poNumber?: string | null; address?: string | null }) => {
      const { data, error } = await supabase.rpc('accept_quotation', {
        p_quotation_id: input.quotationId,
        p_po_number: input.poNumber ?? null,
        p_delivery_address: input.address ?? null,
      })
      if (error) throw error
      const rows = (data ?? []) as { order_id: string; order_number: string; total: number }[]
      if (!rows[0]) throw new Error('conversion failed')
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })
}

export function useSendQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const { error } = await supabase.from('quotations').update({ status: 'sent' }).eq('id', quotationId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

/* ------------------------------------------------------------------ */
/* Invoices & payments                                                 */
/* ------------------------------------------------------------------ */

export interface InvoiceRow extends Invoice {
  companies: Pick<Company, 'name_ar' | 'name_en' | 'billing_address' | 'tax_id'> | null
  orders: Pick<Order, 'order_number' | 'po_number'> | null
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<InvoiceRow[]> => {
      await supabase.rpc('refresh_overdue_invoices')
      const { data, error } = await supabase
        .from('invoices')
        .select('*, companies(name_ar, name_en, billing_address, tax_id), orders(order_number, po_number)')
        .order('issue_date', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as unknown as InvoiceRow[]
    },
  })
}

export function useInvoiceForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-for-order', orderId],
    enabled: Boolean(orderId),
    queryFn: async (): Promise<Invoice | null> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId!)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
  })
}

export function usePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useIssueInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('issue_invoice', { p_order_id: orderId })
      if (error) throw error
      const rows = (data ?? []) as { invoice_id: string; invoice_number: string; total: number }[]
      if (!rows[0]) throw new Error('invoice failed')
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice-for-order'] })
    },
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string
      amount: number
      method: PaymentMethod
      reference?: string | null
    }) => {
      const { data, error } = await supabase.rpc('record_payment', {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_method: input.method,
        p_reference: input.reference ?? null,
      })
      if (error) throw error
      return (data ?? []) as { amount_paid: number; status: string }[]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoice-for-order'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Internal approval inbox                                             */
/* ------------------------------------------------------------------ */

export function usePendingApprovals() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['pending-approvals', profile?.company_id],
    enabled: profile?.role === 'customer_admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(id, qty, unit_price_snapshot, products(name_ar, name_en, sku))')
        .eq('internal_approval', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as (Order & {
        order_items: {
          id: string
          qty: number
          unit_price_snapshot: number
          products: Pick<Product, 'name_ar' | 'name_en' | 'sku'> | null
        }[]
      })[]
    },
  })
}

export function useDecideApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { orderId: string; approve: boolean; comment?: string | null }) => {
      const { error } = await supabase.rpc('decide_internal_approval', {
        p_order_id: input.orderId,
        p_approve: input.approve,
        p_comment: input.comment ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-approvals'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Recurring orders                                                    */
/* ------------------------------------------------------------------ */

export function useRecurringOrders() {
  return useQuery({
    queryKey: ['recurring-orders'],
    queryFn: async (): Promise<RecurringOrder[]> => {
      const { data, error } = await supabase
        .from('recurring_orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveRecurringOrder() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      id?: string
      name: string
      frequency: RecurringOrder['frequency']
      items: { product_id: string; qty: number }[]
      isActive?: boolean
    }) => {
      const payload = {
        name: input.name,
        frequency: input.frequency,
        items: input.items,
        is_active: input.isActive ?? true,
        company_id: profile?.company_id ?? undefined,
        created_by: profile?.id,
        next_run_date: new Date().toISOString().slice(0, 10),
      }
      const { error } = input.id
        ? await supabase.from('recurring_orders').update(payload).eq('id', input.id)
        : await supabase.from('recurring_orders').insert(payload)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-orders'] }),
  })
}

export function useToggleRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('recurring_orders')
        .update({ is_active: input.isActive })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-orders'] }),
  })
}

export function useRunRecurringOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recurringId: string) => {
      const { data, error } = await supabase.rpc('run_recurring_order', {
        p_recurring_id: recurringId,
      })
      if (error) throw error
      const rows = (data ?? []) as { order_id: string; order_number: string; total: number }[]
      if (!rows[0]) throw new Error('run failed')
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export interface RevenueRow {
  month: string
  orders_count: number
  revenue_sdg: number
  revenue_usd: number
}
export interface TopCustomerRow {
  company_id: string
  name_ar: string
  name_en: string | null
  orders_count: number
  revenue_sdg: number
}
export interface TopProductRow {
  product_id: string
  sku: string
  name_ar: string
  qty_sold: number
  revenue_sdg: number
}
export interface MarginRow {
  month: string
  revenue_sdg: number
  cost_sdg: number
  margin_sdg: number
  margin_percent: number
}
export interface AgedRow {
  bucket: string
  invoices_count: number
  amount_sdg: number
}

export function useReports() {
  const { isStaff } = useAuth()
  return useQuery({
    queryKey: ['reports'],
    enabled: isStaff,
    queryFn: async () => {
      const [revenue, customers, products, margin, aged] = await Promise.all([
        supabase.rpc('report_revenue_by_month', { p_months: 12 }),
        supabase.rpc('report_top_customers', { p_limit: 8 }),
        supabase.rpc('report_top_products', { p_limit: 8 }),
        supabase.rpc('report_margin', { p_months: 6 }),
        supabase.rpc('report_aged_receivables'),
      ])
      const firstError =
        revenue.error || customers.error || products.error || margin.error || aged.error
      if (firstError) throw firstError
      return {
        revenue: (revenue.data ?? []) as RevenueRow[],
        customers: (customers.data ?? []) as TopCustomerRow[],
        products: (products.data ?? []) as TopProductRow[],
        margin: (margin.data ?? []) as MarginRow[],
        aged: (aged.data ?? []) as AgedRow[],
      }
    },
    staleTime: 5 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/* Quote requests (RFQ) — customer-initiated                           */
/* ------------------------------------------------------------------ */

export interface QuoteRequestWithItems extends QuoteRequest {
  companies: Pick<Company, 'name_ar' | 'name_en'> | null
  quotations: Pick<Quotation, 'quote_number'> | null
  quote_request_items: (QuoteRequestItem & {
    products: Pick<Product, 'name_ar' | 'name_en' | 'sku'> | null
  })[]
}

/**
 * One list for both audiences: RLS narrows it to the caller's own company for
 * customers and leaves it whole for staff, so there is no second query and no
 * chance of the two views drifting apart.
 */
export function useQuoteRequests() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['quote-requests', session?.user?.id],
    enabled: Boolean(session),
    queryFn: async (): Promise<QuoteRequestWithItems[]> => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(
          '*, companies(name_ar, name_en), quotations(quote_number), ' +
            'quote_request_items(*, products(name_ar, name_en, sku))',
        )
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as unknown as QuoteRequestWithItems[]
    },
  })
}

export interface QuoteRequestLine {
  product_id?: string | null
  description?: string | null
  qty: number
  note?: string | null
}

export function useSubmitQuoteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      items: QuoteRequestLine[]
      notes?: string | null
      neededBy?: string | null
    }) => {
      const { data, error } = await supabase.rpc('submit_quote_request', {
        p_items: input.items,
        p_notes: input.notes ?? null,
        p_needed_by: input.neededBy || null,
      })
      if (error) throw error
      const rows = (data ?? []) as QuoteRequestResult[]
      if (!rows[0]) throw new Error('request failed')
      return rows[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-requests'] }),
  })
}

function useRequestAction<T>(fn: (input: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-requests'] }),
  })
}

export function useCancelQuoteRequest() {
  return useRequestAction<string>(async (requestId) => {
    const { error } = await supabase.rpc('cancel_quote_request', { p_request_id: requestId })
    if (error) throw error
  })
}

export function useClaimQuoteRequest() {
  return useRequestAction<string>(async (requestId) => {
    const { error } = await supabase.rpc('claim_quote_request', { p_request_id: requestId })
    if (error) throw error
  })
}

export function useDeclineQuoteRequest() {
  return useRequestAction<{ requestId: string; reason: string }>(async ({ requestId, reason }) => {
    const { error } = await supabase.rpc('decline_quote_request', {
      p_request_id: requestId,
      p_reason: reason,
    })
    if (error) throw error
  })
}

export function useQuoteRequestToQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: string; vatPercent?: number; validityDays?: number }) => {
      const { data, error } = await supabase.rpc('quote_request_to_quotation', {
        p_request_id: input.requestId,
        p_vat_percent: input.vatPercent ?? 0,
        p_validity_days: input.validityDays ?? 7,
      })
      if (error) throw error
      const rows = (data ?? []) as {
        quotation_id: string
        quote_number: string
        total: number
        skipped_lines: number
      }[]
      if (!rows[0]) throw new Error('conversion failed')
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote-requests'] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}
