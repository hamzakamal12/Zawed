'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useMessages } from '@/components/LocaleProvider'
import { FiLogOut } from 'react-icons/fi'

export default function Header({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const m = useMessages()
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }
  return (
    <header className="h-14 border-b border-secondary-200 bg-white flex items-center gap-3 px-6">
      <LanguageSwitcher className="me-auto" />
      <div className="text-end">
        <div className="text-sm font-medium text-secondary-900">{name}</div>
        <div className="text-xs text-secondary-500">{email}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>
        <FiLogOut /> {m.common.signOut}
      </Button>
    </header>
  )
}
