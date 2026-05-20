import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './db'
import { SESSION_COOKIE, verifySession, type SessionPayload } from './auth'
import type { Role } from '@prisma/client'

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null
  return await verifySession(token)
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession()
  if (!roles.includes(session.role)) {
    redirect('/dashboard')
  }
  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  return prisma.user.findUnique({
    where: { id: session.sub },
    include: { company: true },
  })
}
