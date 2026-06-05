export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const community = await prisma.community.findUnique({ where: { slug: params.slug } })
  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: session.sub, communityId: community.id } },
  })

  if (existing) {
    await prisma.communityMember.delete({ where: { id: existing.id } })
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: { decrement: 1 } },
    })
    return NextResponse.json({ ok: true, isMember: false })
  }

  await prisma.communityMember.create({
    data: { userId: session.sub, communityId: community.id },
  })
  await prisma.community.update({
    where: { id: community.id },
    data: { memberCount: { increment: 1 } },
  })
  return NextResponse.json({ ok: true, isMember: true })
}
