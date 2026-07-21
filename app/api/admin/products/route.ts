import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.string().min(1),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  price: z.number().positive(),
  featured: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } })
  if (existing) return NextResponse.json({ error: 'رمز المنتج (SKU) مستخدم بالفعل' }, { status: 409 })

  const product = await prisma.product.create({
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      brand: parsed.data.brand || null,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      categoryId: parsed.data.categoryId,
      stock: parsed.data.stock,
      lowStockThreshold: parsed.data.lowStockThreshold,
      featured: parsed.data.featured ?? false,
      // A retail product gets a single open-ended price tier.
      priceTiers: {
        create: [{ minQty: 1, maxQty: null, unitPrice: parsed.data.price }],
      },
    },
  })
  return NextResponse.json({ ok: true, id: product.id })
}
