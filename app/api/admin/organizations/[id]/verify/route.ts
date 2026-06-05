import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'

const schema = z.object({ verified: z.boolean() })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireRole(['ADMIN'])
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.company.update({
    where: { id: params.id },
    data: { verified: parsed.data.verified },
  })

  return NextResponse.json({ ok: true, verified: parsed.data.verified })
}
