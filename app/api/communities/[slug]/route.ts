export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const session = await getSession()

  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
  })
  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let isMember = false
  if (session) {
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: session.sub, communityId: community.id } },
    })
    isMember = !!membership
  }

  return NextResponse.json({ community, isMember })
}
