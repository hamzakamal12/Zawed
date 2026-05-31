// Server-only password hashing helpers (bcryptjs is not edge-runtime safe,
// so this is split out from lib/auth.ts which is also imported by middleware).
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
