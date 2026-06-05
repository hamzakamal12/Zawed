export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()

  const communities = await prisma.community.findMany({
    orderBy: { memberCount: 'desc' },
  })

  let memberCommunityIds: Set<string> = new Set()
  if (session) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId: session.sub },
      select: { communityId: true },
    })
    memberCommunityIds = new Set(memberships.map((m) => m.communityId))
  }

  return NextResponse.json({
    communities: communities.map((c) => ({
      ...c,
      isMember: memberCommunityIds.has(c.id),
    })),
  })
}
