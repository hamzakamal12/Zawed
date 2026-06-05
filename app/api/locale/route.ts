import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ locale: z.enum(['en', 'ar']) })

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('NEXT_LOCALE', parsed.data.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return res
}
