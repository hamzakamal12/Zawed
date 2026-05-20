import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { getOrCreateActiveCart } from '@/lib/cart'

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } })
  if (!product || !product.active) {
    return NextResponse.json({ error: 'Product unavailable' }, { status: 404 })
  }

  const cart = await getOrCreateActiveCart(session.sub, session.companyId)

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
  })

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + parsed.data.quantity },
    })
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, quantity: parsed.data.quantity },
    })
  }

  return NextResponse.json({ ok: true, cartId: cart.id })
}

const updateSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number().int().min(0),
})

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const item = await prisma.cartItem.findUnique({
    where: { id: parsed.data.cartItemId },
    include: { cart: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Owner of the cart, or a Manager/Admin in the same company, can edit.
  const canEdit =
    item.cart.userId === session.sub ||
    ((session.role === 'MANAGER' || session.role === 'ADMIN') &&
      item.cart.companyId === session.companyId)
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (parsed.data.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
  } else {
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity },
    })
  }

  return NextResponse.json({ ok: true })
}

const deleteSchema = z.object({ cartItemId: z.string() })

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const item = await prisma.cartItem.findUnique({
    where: { id: parsed.data.cartItemId },
    include: { cart: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit =
    item.cart.userId === session.sub ||
    ((session.role === 'MANAGER' || session.role === 'ADMIN') &&
      item.cart.companyId === session.companyId)
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.cartItem.delete({ where: { id: item.id } })
  return NextResponse.json({ ok: true })
}
