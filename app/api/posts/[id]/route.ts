export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true, role: true,
        },
      },
      community: { select: { name: true, slug: true } },
    },
  })

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  let userVote: number | null = null
  if (session) {
    const vote = await prisma.vote.findUnique({
      where: { userId_postId: { userId: session.sub, postId: post.id } },
    })
    userVote = vote?.value ?? null
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  })

  return NextResponse.json({ post: { ...post, userVote } })
}
