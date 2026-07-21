'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { FiLogOut, FiShoppingBag } from 'react-icons/fi'

export default function Header({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }
  return (
    <header className="h-14 border-b border-secondary-200 bg-white flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-20">
      {/* Brand — visible on mobile where the sidebar is hidden. */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
          ز
        </div>
        <span className="font-extrabold">زوّد بيوتي</span>
      </Link>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Link href="/cart" className="md:hidden">
          <Button variant="ghost" size="sm" aria-label="السلة">
            <FiShoppingBag className="text-lg" />
          </Button>
        </Link>
        <div className="text-left hidden sm:block">
          <div className="text-sm font-medium text-secondary-900">{name}</div>
          <div className="text-xs text-secondary-500">{email}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <FiLogOut /> <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  )
}
