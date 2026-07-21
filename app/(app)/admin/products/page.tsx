import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { resolveUnitPrice } from '@/lib/pricing'
import StockEditor from './StockEditor'
import NewProductForm from './NewProductForm'

export default async function AdminProductsPage() {
  await requireRole(['ADMIN'])
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true, priceTiers: { orderBy: { minQty: 'asc' } } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">إدارة المنتجات</h1>
        <p className="text-secondary-500 mt-1">أضيفي منتجات جديدة وعدّلي المخزون والأسعار.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إضافة منتج جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <NewProductForm categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المخزون</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">المنتج</th>
                <th className="py-3 px-4">الصنف</th>
                <th className="py-3 px-4">السعر</th>
                <th className="py-3 px-4">المخزون</th>
                <th className="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock <= p.lowStockThreshold
                const price = resolveUnitPrice(
                  p.priceTiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, unitPrice: t.unitPrice.toString() })),
                  1,
                )
                return (
                  <tr key={p.id} className="border-b border-secondary-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-secondary-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4">{p.category.name}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatCurrency(price)}</td>
                    <td className="py-3 px-4">
                      <StockEditor productId={p.id} stock={p.stock} />
                    </td>
                    <td className="py-3 px-4">
                      {p.stock === 0 ? (
                        <Badge variant="danger">نفذ</Badge>
                      ) : low ? (
                        <Badge variant="warning">منخفض</Badge>
                      ) : (
                        <Badge variant="success">متوفر</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
