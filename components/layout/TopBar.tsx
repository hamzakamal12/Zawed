'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TopBarProps {
  title?: string
  username: string
}

export function TopBar({ title, username }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Mobile: back or title */}
        {title ? (
          <h1 className="text-slate-100 font-bold text-lg">{title}</h1>
        ) : (
          <span className="text-primary-400 font-black text-xl md:hidden">زاود</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/explore"
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-surface-2 rounded-lg transition-colors"
          title="بحث واستكشاف"
        >
          🔍
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
        >
          خروج
        </button>
      </div>
    </div>
  )
}
