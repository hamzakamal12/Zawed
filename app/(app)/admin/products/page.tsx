import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import StockEditor from './StockEditor'
import NewProductForm from './NewProductForm'

export default async function AdminProductsPage() {
  await requireRole(['ADMIN'])
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        priceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Manage products</h1>
        <p className="text-secondary-500 mt-1">
          Add new SKUs, adjust stock, and configure tiered pricing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add new product</CardTitle>
        </CardHeader>
        <CardContent>
          <NewProductForm categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Tiers</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock <= p.lowStockThreshold
                return (
                  <tr key={p.id} className="border-b border-secondary-50">
                    <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4">{p.category.name}</td>
                    <td className="py-3 px-4 text-xs text-secondary-500">
                      {p.priceTiers.length} break{p.priceTiers.length === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 px-4">
                      <StockEditor productId={p.id} stock={p.stock} />
                    </td>
                    <td className="py-3 px-4 text-secondary-600">{p.lowStockThreshold}</td>
                    <td className="py-3 px-4">
                      {p.stock === 0 ? (
                        <Badge variant="danger">Out</Badge>
                      ) : low ? (
                        <Badge variant="warning">Low</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
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
