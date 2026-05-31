import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { formatTierRange } from '@/lib/pricing'
import AddToCartForm from './AddToCartForm'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      priceTiers: { orderBy: { minQty: 'asc' } },
    },
  })
  if (!product) notFound()

  const tiers = product.priceTiers.map((t) => ({
    ...t,
    unitPrice: t.unitPrice.toString(),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/products" className="text-sm text-primary-600 hover:underline">
        ← Back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-lg bg-white border border-secondary-200 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-8xl">📦</div>
          )}
        </div>

        <div>
          <div className="text-sm text-secondary-500 uppercase">{product.category.name}</div>
          <h1 className="text-3xl font-bold text-secondary-900 mt-1">{product.name}</h1>
          <p className="text-sm text-secondary-500 mt-1">SKU: {product.sku}</p>

          {product.description && (
            <p className="mt-4 text-secondary-600">{product.description}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            {product.stock === 0 ? (
              <Badge variant="danger">Out of stock</Badge>
            ) : product.stock <= product.lowStockThreshold ? (
              <Badge variant="warning">Low stock — {product.stock} left</Badge>
            ) : (
              <Badge variant="success">In stock — {product.stock} available</Badge>
            )}
          </div>

          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-secondary-500 mb-2">
                Volume pricing
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-secondary-500 border-b border-secondary-100">
                    <th className="py-2">Quantity</th>
                    <th className="py-2 text-right">Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.id} className="border-b border-secondary-50 last:border-0">
                      <td className="py-2">{formatTierRange(t)}</td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(parseFloat(t.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="mt-6">
            <AddToCartForm productId={product.id} tiers={tiers} stock={product.stock} />
          </div>
        </div>
      </div>
    </div>
  )
}
