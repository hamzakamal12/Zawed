import type { Role } from '@prisma/client'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name: string; email: string; role: Role }
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header name={user.name} email={user.email} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
