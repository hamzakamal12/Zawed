import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  name: z.string().min(1),
  frequency: z.enum(['WEEKLY', 'MONTHLY']),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }))
    .min(1),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const now = new Date()
  const next = new Date(now)
  if (parsed.data.frequency === 'WEEKLY') next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)

  const sub = await prisma.subscription.create({
    data: {
      companyId: session.companyId,
      createdById: session.sub,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      nextRunAt: next,
      items: { create: parsed.data.items },
    },
  })
  return NextResponse.json({ ok: true, id: sub.id })
}

const toggleSchema = z.object({ id: z.string(), active: z.boolean() })

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const sub = await prisma.subscription.findUnique({ where: { id: parsed.data.id } })
  if (!sub || sub.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { active: parsed.data.active },
  })
  return NextResponse.json({ ok: true })
}
