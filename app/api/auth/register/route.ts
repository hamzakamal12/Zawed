import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

const schema = z.object({
  name: z.string().min(1),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const { name, username, email, password } = parsed.data
  const emailLower = email.toLowerCase()
  const usernameLower = username.toLowerCase()

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: emailLower } }),
    prisma.user.findUnique({ where: { username: usernameLower } }),
  ])

  if (existingEmail) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }
  if (existingUsername) {
    return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: emailLower,
      username: usernameLower,
      name,
      passwordHash,
    },
  })

  const token = await signSession({
    sub: user.id,
    email: user.email,
    username: user.username,
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
