import { SignJWT, jwtVerify } from 'jose'
import type { UserRole } from '@prisma/client'

const SECRET = process.env.AUTH_SECRET || 'dev-secret-do-not-use-in-production'
const encoder = new TextEncoder()
const key = encoder.encode(SECRET)

export const SESSION_COOKIE = 'zawed_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export interface SessionPayload {
  sub: string
  email: string
  username: string
  name: string
  role: UserRole
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username as string,
      name: payload.name,
      role: payload.role as UserRole,
    }
  } catch {
    return null
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS
