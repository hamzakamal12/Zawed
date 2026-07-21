import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

const schema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  phone: z.string().min(7, 'رقم الهاتف مطلوب').optional().or(z.literal('')),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'بيانات غير صحيحة' },
      { status: 400 },
    )
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'يوجد حساب مسجّل بهذا البريد بالفعل' }, { status: 409 })
  }

  const passwordHash = await hashPassword(parsed.data.password)

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      passwordHash,
      role: 'CUSTOMER',
    },
  })

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
