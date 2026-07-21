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
    brand: string | null
    description: string | null
    imageUrl: string | null
    stock: number
    lowStockThreshold: number
    featured: boolean
    category: { name: string; slug: string; emoji: string | null }
    priceTiers: PriceTierLite[]
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const price = resolveUnitPrice(product.priceTiers, 1)
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold
  const outOfStock = product.stock === 0

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl overflow-hidden">
        <div className="aspect-square bg-primary-50/60 flex items-center justify-center overflow-hidden relative">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">{product.category.emoji ?? '💄'}</div>
          )}
          {product.featured && (
            <span className="absolute top-2 right-2">
              <Badge variant="info">مميّز ✨</Badge>
            </span>
          )}
        </div>
        <CardContent className="pt-4">
          <div className="text-xs text-primary-600 font-medium">
            {product.brand ?? product.category.name}
          </div>
          <h3 className="font-semibold text-secondary-900 line-clamp-1 mt-1">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-secondary-500 line-clamp-2 mt-1">{product.description}</p>
          )}
          <div className="mt-3 flex items-end justify-between">
            <div className="text-lg font-bold text-secondary-900">{formatCurrency(price)}</div>
            {outOfStock ? (
              <Badge variant="danger">نفذت الكمية</Badge>
            ) : lowStock ? (
              <Badge variant="warning">كمية محدودة</Badge>
            ) : (
              <Badge variant="success">متوفر</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
