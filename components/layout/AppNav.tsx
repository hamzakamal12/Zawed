'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from '@/components/user/ReputationBadge'

interface NavUser {
  name: string
  username: string
  avatarUrl?: string | null
  reputationScore: number
  role: string
}

interface AppNavProps {
  user: NavUser
}

const navItems = [
  { href: '/feed', icon: '🏠', label: 'الرئيسية' },
  { href: '/explore', icon: '🔍', label: 'استكشف' },
  { href: '/communities', icon: '👥', label: 'المجتمعات' },
  { href: '/rooms', icon: '💬', label: 'غرف النقاش' },
]

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full py-4 px-3 gap-1">
      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-2 px-3 py-2 mb-4">
        <span className="text-2xl font-black text-primary-400 tracking-tight">زاود</span>
        <span className="text-xs text-slate-500 font-medium mt-1">Finance</span>
      </Link>

      {/* Nav links */}
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${isActive
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
              }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}

      {/* Create post */}
      <Link
        href="/create"
        className="mt-4 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
      >
        <span>+</span>
        <span>نشر تحليل</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User profile */}
      <Link
        href={`/profile/${user.username}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors"
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-slate-100 text-sm font-medium truncate">{user.name}</div>
          <div className="text-slate-500 text-xs truncate">@{user.username}</div>
        </div>
        <ReputationBadge score={user.reputationScore} />
      </Link>
    </nav>
  )
}
