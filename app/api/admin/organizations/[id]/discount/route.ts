import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'

// discountPercent is 0-50 (e.g. 10 means 10%); stored as decimal ratio (0.10)
const schema = z.object({ discountPercent: z.number().min(0).max(50) })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireRole(['ADMIN'])
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ngoDiscount = parsed.data.discountPercent / 100

  await prisma.company.update({
    where: { id: params.id },
    data: { ngoDiscount },
  })

  return NextResponse.json({ ok: true, ngoDiscount })
}
