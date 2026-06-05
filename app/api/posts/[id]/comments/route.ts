export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { postId: params.id, parentId: null },
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true,
        },
      },
      replies: {
        include: {
          author: {
            select: {
              id: true, name: true, username: true, avatarUrl: true,
              reputationScore: true, isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ comments })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const comment = await prisma.comment.create({
    data: {
      postId: params.id,
      authorId: session.sub,
      content: parsed.data.content,
      parentId: parsed.data.parentId ?? null,
    },
    include: {
      author: {
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          reputationScore: true, isVerified: true,
        },
      },
    },
  })

  await prisma.post.update({
    where: { id: params.id },
    data: { commentCount: { increment: 1 } },
  })

  return NextResponse.json({ ok: true, comment }, { status: 201 })
}
