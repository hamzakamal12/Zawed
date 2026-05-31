import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cart = await prisma.cart.findFirst({
    where: { userId: session.sub, status: 'ACTIVE' },
    include: { items: true },
  })
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'PENDING_APPROVAL', submittedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
