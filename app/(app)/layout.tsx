import { requireSession } from '@/lib/session'
import AppShell from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  return <AppShell user={session}>{children}</AppShell>
}
