export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const messages = await prisma.roomMessage.findMany({
    where: { roomId: params.id },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true,
        },
      },
    },
  })
  return NextResponse.json({ messages })
}

const schema = z.object({ content: z.string().min(1).max(1000) })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const message = await prisma.roomMessage.create({
    data: { roomId: params.id, authorId: session.sub, content: parsed.data.content },
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true,
        },
      },
    },
  })

  return NextResponse.json({ ok: true, message }, { status: 201 })
}
