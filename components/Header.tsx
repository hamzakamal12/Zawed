'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { FiLogOut } from 'react-icons/fi'

export default function Header({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }
  return (
    <header className="h-14 border-b border-secondary-200 bg-white flex items-center justify-end gap-3 px-6">
      <div className="text-right">
        <div className="text-sm font-medium text-secondary-900">{name}</div>
        <div className="text-xs text-secondary-500">{email}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>
        <FiLogOut /> Sign out
      </Button>
    </header>
  )
}
