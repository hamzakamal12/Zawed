import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { resolveUnitPrice, type PriceTierLite } from '@/lib/pricing'

interface ProductCardProps {
  product: {
    id: string
    sku: string
    name: string
    description: string | null
    imageUrl: string | null
    stock: number
    lowStockThreshold: number
    category: { name: string; slug: string }
    priceTiers: PriceTierLite[]
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const startingPrice = resolveUnitPrice(product.priceTiers, 1)
  const bestPrice = product.priceTiers.length
    ? Math.min(
        ...product.priceTiers.map((t) =>
          typeof t.unitPrice === 'string' ? parseFloat(t.unitPrice) : Number(t.unitPrice),
        ),
      )
    : startingPrice
  const hasDiscount = bestPrice < startingPrice
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold
  const outOfStock = product.stock === 0

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-[4/3] bg-secondary-100 rounded-t-lg flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-5xl">📦</div>
          )}
        </div>
        <CardContent className="pt-4">
          <div className="text-xs text-secondary-500 uppercase tracking-wide">
            {product.category.name}
          </div>
          <h3 className="font-semibold text-secondary-900 line-clamp-1 mt-1">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-secondary-500 line-clamp-2 mt-1">{product.description}</p>
          )}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-secondary-900">
                {formatCurrency(startingPrice)}
              </div>
              <div className="text-xs text-secondary-500">per unit</div>
            </div>
            {hasDiscount && (
              <Badge variant="info">From {formatCurrency(bestPrice)} at volume</Badge>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            {outOfStock ? (
              <Badge variant="danger">Out of stock</Badge>
            ) : lowStock ? (
              <Badge variant="warning">Only {product.stock} left</Badge>
            ) : (
              <Badge variant="default">{product.stock} in stock</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
