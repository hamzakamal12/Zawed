import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cart = await prisma.cart.findUnique({ where: { id: params.id } })
  if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cart.companyId !== session.companyId && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (cart.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: 'Cart is not awaiting approval' }, { status: 400 })
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'APPROVED', reviewedById: session.sub, reviewedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
