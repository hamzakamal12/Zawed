import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { resolveUnitPrice } from '@/lib/pricing'
import ApprovalActions from './ApprovalActions'

export default async function ApprovalsPage() {
  const session = await requireRole(['MANAGER', 'ADMIN'])
  const carts = await prisma.cart.findMany({
    where: {
      companyId: session.companyId ?? undefined,
      status: 'PENDING_APPROVAL',
    },
    include: {
      user: true,
      items: {
        include: {
          product: { include: { priceTiers: { orderBy: { minQty: 'asc' } } } },
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Approval queue</h1>
        <p className="text-secondary-500 mt-1">
          Review and approve carts submitted by your team.
        </p>
      </div>

      {carts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-secondary-500">
            No carts are awaiting approval. 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {carts.map((cart) => {
            const lines = cart.items.map((item) => {
              const tiers = item.product.priceTiers.map((t) => ({
                minQty: t.minQty,
                maxQty: t.maxQty,
                unitPrice: t.unitPrice.toString(),
              }))
              const unitPrice = resolveUnitPrice(tiers, item.quantity)
              const subtotal = unitPrice * item.quantity
              const taxRate = Number(item.product.taxRate)
              const taxAmount = subtotal * taxRate
              return {
                id: item.id,
                name: item.product.name,
                sku: item.product.sku,
                quantity: item.quantity,
                stock: item.product.stock,
                unitPrice,
                subtotal,
                taxAmount,
              }
            })
            const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
            const tax = lines.reduce((s, l) => s + l.taxAmount, 0)
            const total = subtotal + tax

            return (
              <Card key={cart.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{cart.user.name}</CardTitle>
                      <p className="text-sm text-secondary-500 mt-0.5">
                        {cart.user.email} · submitted {cart.submittedAt && formatDateTime(cart.submittedAt)}
                      </p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-secondary-100 -mt-2">
                    {lines.map((line) => (
                      <li key={line.id} className="py-2 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-secondary-500">
                            SKU {line.sku} · {formatCurrency(line.unitPrice)} × {line.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {line.quantity > line.stock && (
                            <Badge variant="danger">Over stock</Badge>
                          )}
                          <span className="tabular-nums font-medium">
                            {formatCurrency(line.subtotal)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between">
                    <div className="text-sm space-y-0.5">
                      <div>
                        Subtotal: <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                      </div>
                      <div>
                        Tax: <span className="tabular-nums">{formatCurrency(tax)}</span>
                      </div>
                      <div className="font-bold text-base">
                        Total: <span className="tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cart?as=${cart.id}`}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Open in editor
                      </Link>
                      <ApprovalActions cartId={cart.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
