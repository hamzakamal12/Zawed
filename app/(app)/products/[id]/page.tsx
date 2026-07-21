import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { formatTierRange, resolveUnitPrice } from '@/lib/pricing'
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
  const price = resolveUnitPrice(tiers, 1)
  const hasWholesale = tiers.length > 1

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/products" className="text-sm text-primary-600 hover:underline">
        → العودة للمتجر
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl bg-primary-50/60 border border-primary-100 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-8xl">{product.category.emoji ?? '💄'}</div>
          )}
        </div>

        <div>
          <div className="text-sm text-primary-600 font-medium">
            {product.brand ? `${product.brand} · ` : ''}
            {product.category.name}
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 mt-1">{product.name}</h1>
          <div className="mt-2 text-2xl font-extrabold text-primary-700">
            {formatCurrency(price)}
          </div>

          {product.description && <p className="mt-4 text-secondary-600 leading-relaxed">{product.description}</p>}

          <div className="mt-6 flex items-center gap-3">
            {product.stock === 0 ? (
              <Badge variant="danger">نفذت الكمية</Badge>
            ) : product.stock <= product.lowStockThreshold ? (
              <Badge variant="warning">كمية محدودة — بقي {product.stock}</Badge>
            ) : (
              <Badge variant="success">متوفر في المخزون</Badge>
            )}
          </div>

          {hasWholesale && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="text-xs font-semibold text-secondary-500 mb-2">
                  أسعار الجملة (خصم عند الكمية)
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-xs text-secondary-500 border-b border-secondary-100">
                      <th className="py-2">الكمية</th>
                      <th className="py-2 text-left">سعر القطعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t) => (
                      <tr key={t.id} className="border-b border-secondary-50 last:border-0">
                        <td className="py-2">{formatTierRange(t)}</td>
                        <td className="py-2 text-left font-medium">
                          {formatCurrency(parseFloat(t.unitPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="mt-6">
            <AddToCartForm productId={product.id} tiers={tiers} stock={product.stock} />
          </div>
        </div>
      </div>
    </div>
  )
}
