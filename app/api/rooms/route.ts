export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const rooms = await prisma.room.findMany({
    orderBy: [{ isLive: 'desc' }, { participantCount: 'desc' }],
    include: {
      _count: { select: { messages: true } },
    },
  })
  return NextResponse.json({ rooms })
}
