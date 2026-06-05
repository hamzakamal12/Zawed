import { prisma } from '@/lib/db'
import CategoryFilter from '@/components/products/CategoryFilter'
import ProductCard from '@/components/products/ProductCard'
import SearchBar from '@/components/products/SearchBar'

interface PageProps {
  searchParams: { category?: string; q?: string }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      where: {
        active: true,
        ...(searchParams.category
          ? { category: { slug: searchParams.category } }
          : {}),
        ...(searchParams.q
          ? {
              OR: [
                { name: { contains: searchParams.q, mode: 'insensitive' as const } },
                { sku: { contains: searchParams.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        priceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const serialized = products.map((p) => ({
    ...p,
    priceTiers: p.priceTiers.map((t) => ({ ...t, unitPrice: t.unitPrice.toString() })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Catalog</h1>
        <p className="text-secondary-500 mt-1">
          Browse pantry, beverages, and office supplies with volume discounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar />
        <CategoryFilter categories={categories} />
      </div>

      {serialized.length === 0 ? (
        <div className="text-center py-20 text-secondary-500">
          {searchParams.q
            ? `لا توجد نتائج لـ "${searchParams.q}"`
            : 'No products match your filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {serialized.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
