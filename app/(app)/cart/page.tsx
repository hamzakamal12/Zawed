import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { getOrCreateActiveCart, computeCart } from '@/lib/cart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import CartLines from './CartLines'
import CheckoutForm from './CheckoutForm'

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE ?? 1000)
const FREE_DELIVERY_OVER = Number(process.env.FREE_DELIVERY_OVER ?? 20000)

export default async function CartPage() {
  const session = await requireSession()

  const [cart, user] = await Promise.all([
    getOrCreateActiveCart(session.sub),
    prisma.user.findUnique({ where: { id: session.sub } }),
  ])

  const { lines, totals } = await computeCart(cart.id)

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { category: true, priceTiers: { orderBy: { minQty: 'asc' } } } } },
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
      emoji: item.product.category.emoji,
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

  const deliveryFee = totals.subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE
  const grandTotal = totals.totalAmount + deliveryFee

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">سلة التسوّق</h1>
        <p className="text-secondary-500 mt-1">راجعي طلبك وأكملي بيانات التوصيل.</p>
      </div>

      {lineRows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="text-secondary-500 mb-4">سلتك فارغة.</p>
            <Link href="/products" className="text-primary-600 hover:underline font-medium">
              تصفّحي المتجر ←
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CartLines cartId={cart.id} items={lineRows} />
          </div>

          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>ملخّص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="المجموع الفرعي" value={formatCurrency(totals.subtotal)} />
                {totals.taxAmount > 0 && <Row label="الضريبة" value={formatCurrency(totals.taxAmount)} />}
                <Row
                  label="رسوم التوصيل"
                  value={deliveryFee === 0 ? 'مجاني 🎉' : formatCurrency(deliveryFee)}
                />
                <div className="border-t border-secondary-100 pt-3 flex items-center justify-between">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="font-bold text-lg text-primary-700">{formatCurrency(grandTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-secondary-500">
                    توصيل مجاني للطلبات فوق {formatCurrency(FREE_DELIVERY_OVER)}.
                  </p>
                )}
                <p className="text-xs text-secondary-500">
                  طريقة الدفع: <strong>الدفع عند الاستلام</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>بيانات التوصيل</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckoutForm
                  prefill={{
                    name: user?.name ?? session.name,
                    phone: user?.phone ?? '',
                    city: user?.city ?? '',
                    address: user?.address ?? '',
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
