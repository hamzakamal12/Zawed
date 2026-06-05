import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({ reason: z.string().min(1).max(500).optional() })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const reason = parsed.success ? parsed.data.reason : undefined

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
    data: {
      status: 'REJECTED',
      reviewedById: session.sub,
      reviewedAt: new Date(),
      rejectionReason: reason ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}
