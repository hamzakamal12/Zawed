import { prisma } from '@/lib/db'
import CategoryFilter from '@/components/products/CategoryFilter'
import ProductCard from '@/components/products/ProductCard'
import ProductSearch from './ProductSearch'

interface PageProps {
  searchParams: { category?: string; q?: string }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      where: {
        active: true,
        ...(searchParams.category ? { category: { slug: searchParams.category } } : {}),
        ...(searchParams.q
          ? {
              OR: [
                { name: { contains: searchParams.q, mode: 'insensitive' as const } },
                { brand: { contains: searchParams.q, mode: 'insensitive' as const } },
                { description: { contains: searchParams.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        priceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    }),
  ])

  const serialized = products.map((p) => ({
    ...p,
    priceTiers: p.priceTiers.map((t) => ({ ...t, unitPrice: t.unitPrice.toString() })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">المتجر</h1>
        <p className="text-secondary-500 mt-1">
          تصفّحي مستحضرات التجميل والعناية بالبشرة والشعر والعطور.
        </p>
      </div>

      <ProductSearch />
      <CategoryFilter categories={categories} />

      {serialized.length === 0 ? (
        <div className="text-center py-20 text-secondary-500">لا توجد منتجات مطابقة.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {serialized.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
