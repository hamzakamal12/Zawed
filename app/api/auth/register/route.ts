import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

const newCompany = z.object({
  mode: z.literal('company'),
  companyName: z.string().min(1),
  companyAddress: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

const joinCompany = z.object({
  mode: z.literal('invite'),
  companyCode: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STAFF', 'MANAGER']),
})

const schema = z.discriminatedUnion('mode', [newCompany, joinCompany])

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const passwordHash = await hashPassword(parsed.data.password)

  let user

  if (parsed.data.mode === 'company') {
    const data = parsed.data
    user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          address: data.companyAddress || null,
          taxId: data.taxId || null,
          email,
        },
      })
      return tx.user.create({
        data: {
          email,
          name: data.name,
          passwordHash,
          role: 'MANAGER',
          companyId: company.id,
        },
      })
    })
  } else {
    const data = parsed.data
    const company = await prisma.company.findUnique({ where: { id: data.companyCode } })
    if (!company) {
      return NextResponse.json({ error: 'Invalid company code' }, { status: 400 })
    }
    user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        passwordHash,
        role: data.role,
        companyId: company.id,
      },
    })
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
  })
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return NextResponse.json({ ok: true, role: user.role })
}
