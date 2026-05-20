import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  taxRate: z.number().min(0).max(1),
  tiers: z
    .array(
      z.object({
        minQty: z.number().int().positive(),
        maxQty: z.number().int().nullable(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } })
  if (existing) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

  const product = await prisma.product.create({
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      description: parsed.data.description || null,
      categoryId: parsed.data.categoryId,
      stock: parsed.data.stock,
      lowStockThreshold: parsed.data.lowStockThreshold,
      taxRate: parsed.data.taxRate,
      priceTiers: {
        create: parsed.data.tiers.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: t.unitPrice,
        })),
      },
    },
  })
  return NextResponse.json({ ok: true, id: product.id })
}
