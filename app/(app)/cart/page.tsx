import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { getOrCreateActiveCart, computeCart } from '@/lib/cart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import CartLines from './CartLines'
import CartActions from './CartActions'

export default async function CartPage() {
  const session = await requireSession()
  if (!session.companyId) {
    return <div>Your account isn't linked to a company.</div>
  }

  // Find the user's most recent cart (in any status).
  let cart = await prisma.cart.findFirst({
    where: { userId: session.sub },
    orderBy: { createdAt: 'desc' },
  })
  if (!cart || cart.status === 'CHECKED_OUT' || cart.status === 'REJECTED') {
    cart = await getOrCreateActiveCart(session.sub, session.companyId)
  }

  const company = await prisma.company.findUnique({ where: { id: session.companyId } })
  const ngoDiscountRate = company?.verified ? Number(company.ngoDiscount) : 0

  const { lines, totals } = await computeCart(cart.id, ngoDiscountRate)

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { priceTiers: { orderBy: { minQty: 'asc' } } } } },
  })
  const lineRows = items.map((item) => {
    const computed = lines.find((l) => l.productId === item.productId)!
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      quantity: item.quantity,
      stock: item.product.stock,
      tiers: item.product.priceTiers.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice.toString(),
      })),
      unitPrice: computed.unitPrice,
      subtotal: computed.subtotal,
      taxRate: computed.taxRate,
      taxAmount: computed.taxAmount,
    }
  })

  const canEditQty = session.role === 'MANAGER' || session.role === 'ADMIN' || cart.status === 'ACTIVE'
  const canSubmit = cart.status === 'ACTIVE' && lineRows.length > 0
  const canApprove =
    cart.status === 'PENDING_APPROVAL' && (session.role === 'MANAGER' || session.role === 'ADMIN')
  const canCheckout =
    (cart.status === 'APPROVED' || (cart.status === 'ACTIVE' && session.role !== 'STAFF')) &&
    lineRows.length > 0 &&
    session.role !== 'STAFF'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">My cart</h1>
          <p className="text-secondary-500 mt-1">
            {session.role === 'STAFF'
              ? 'Add items and submit your cart for manager approval.'
              : 'Review items, adjust quantities, and proceed to checkout.'}
          </p>
        </div>
        <CartStatusBadge status={cart.status} />
      </div>

      {cart.rejectionReason && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <strong>Rejected:</strong> {cart.rejectionReason}
        </div>
      )}

      {lineRows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-secondary-500 mb-4">Your cart is empty.</p>
            <Link href="/products" className="text-primary-600 hover:underline">
              Browse the catalog →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CartLines
              cartId={cart.id}
              items={lineRows}
              canEdit={canEditQty}
              role={session.role}
            />
          </div>
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              {totals.discountAmount > 0 && (
                <Row
                  label={`NGO Discount (${Math.round(ngoDiscountRate * 100)}%)`}
                  value={`− ${formatCurrency(totals.discountAmount)}`}
                  highlight
                />
              )}
              <Row label="Tax" value={formatCurrency(totals.taxAmount)} />
              <div className="border-t border-secondary-100 pt-3 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-secondary-900">
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
              <p className="text-xs text-secondary-500 mt-2">
                Payment: <strong>Cash on Delivery</strong>
              </p>
              <CartActions
                cartId={cart.id}
                canSubmit={canSubmit}
                canApprove={canApprove}
                canCheckout={canCheckout}
                isStaff={session.role === 'STAFF'}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={highlight ? 'text-green-700 font-medium' : 'text-secondary-600'}>{label}</span>
      <span className={`tabular-nums ${highlight ? 'text-green-700 font-medium' : ''}`}>{value}</span>
    </div>
  )
}

function CartStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <Badge variant="warning">Pending approval</Badge>
    case 'APPROVED':
      return <Badge variant="success">Approved — ready to checkout</Badge>
    case 'REJECTED':
      return <Badge variant="danger">Rejected</Badge>
    case 'CHECKED_OUT':
      return <Badge variant="info">Checked out</Badge>
    default:
      return <Badge variant="default">Active</Badge>
  }
}
