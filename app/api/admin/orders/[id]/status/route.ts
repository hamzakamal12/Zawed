import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'DELIVERED', 'CANCELLED']),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: parsed.data.status,
      // COD is collected on delivery — mark paid when delivered.
      paidAt: parsed.data.status === 'DELIVERED' ? new Date() : order.paidAt,
    },
  })

  return NextResponse.json({ ok: true })
}
