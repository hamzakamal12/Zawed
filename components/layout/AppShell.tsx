import { AppNav } from './AppNav'
import { TrendingWidget } from './TrendingWidget'
import { TopBar } from './TopBar'

interface AppShellProps {
  user: {
    name: string
    username: string
    avatarUrl?: string | null
    reputationScore: number
    role: string
  }
  children: React.ReactNode
  title?: string
  showTrending?: boolean
}

export function AppShell({ user, children, title, showTrending = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto flex">
        {/* Left: Navigation sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-0 h-screen border-r border-border">
          <AppNav user={user} />
        </aside>

        {/* Center: Main content */}
        <main className="flex-1 min-w-0 border-r border-border">
          <TopBar title={title} username={user.username} />
          {children}
        </main>

        {/* Right: Trending widget (desktop) */}
        {showTrending && (
          <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
            <TrendingWidget />
          </aside>
        )}
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 py-2 flex items-center justify-around z-40">
        <MobileNavLink href="/feed" icon="🏠" label="الرئيسية" />
        <MobileNavLink href="/explore" icon="🔍" label="استكشف" />
        <MobileNavLink href="/create" icon="✏️" label="نشر" primary />
        <MobileNavLink href="/communities" icon="👥" label="مجتمعات" />
        <MobileNavLink href="/rooms" icon="💬" label="غرف" />
      </nav>
    </div>
  )
}

function MobileNavLink({
  href,
  icon,
  label,
  primary,
}: {
  href: string
  icon: string
  label: string
  primary?: boolean
}) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors
        ${primary
          ? 'bg-primary-500 text-black'
          : 'text-slate-400 hover:text-slate-100'
        }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-xs">{label}</span>
    </a>
  )
}
