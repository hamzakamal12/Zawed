import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { getOrCreateActiveCart } from '@/lib/cart'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.companyId !== session.companyId && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cart = await getOrCreateActiveCart(session.sub, session.companyId)

  for (const item of order.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product || !product.active) continue
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
    })
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      })
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
      })
    }
  }

  return NextResponse.json({ ok: true, cartId: cart.id })
}
