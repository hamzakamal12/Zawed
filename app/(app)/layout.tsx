import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      name: true,
      username: true,
      avatarUrl: true,
      reputationScore: true,
      role: true,
    },
  })

  const navUser = user ?? {
    name: session.name,
    username: session.username,
    avatarUrl: null,
    reputationScore: 0,
    role: session.role,
  }

  return <AppShell user={navUser}>{children}</AppShell>
}
