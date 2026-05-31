'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiClipboard,
  FiRepeat,
  FiCheckSquare,
  FiSettings,
  FiUsers,
  FiBox,
} from 'react-icons/fi'
import type { Role } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: Role[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <FiHome />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/products', label: 'Catalog', icon: <FiPackage />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/cart', label: 'My Cart', icon: <FiShoppingCart />, roles: ['STAFF', 'MANAGER'] },
  { href: '/approvals', label: 'Approvals', icon: <FiCheckSquare />, roles: ['MANAGER', 'ADMIN'] },
  { href: '/orders', label: 'Orders', icon: <FiClipboard />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/subscriptions', label: 'Subscriptions', icon: <FiRepeat />, roles: ['MANAGER', 'ADMIN'] },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Admin Overview', icon: <FiSettings />, roles: ['ADMIN'] },
  { href: '/admin/products', label: 'Manage Products', icon: <FiBox />, roles: ['ADMIN'] },
  { href: '/admin/orders', label: 'All Orders', icon: <FiClipboard />, roles: ['ADMIN'] },
  { href: '/admin/users', label: 'Users', icon: <FiUsers />, roles: ['ADMIN'] },
]

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = NAV.filter((i) => i.roles.includes(role))
  const adminItems = ADMIN_NAV.filter((i) => i.roles.includes(role))

  return (
    <aside className="w-60 border-r border-secondary-200 bg-white flex-shrink-0 h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-secondary-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary-600 text-white flex items-center justify-center font-bold">
          Z
        </div>
        <span className="font-bold">Zawed</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <SidebarSection items={items} pathname={pathname} />
        {adminItems.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
              Admin
            </div>
            <SidebarSection items={adminItems} pathname={pathname} />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-secondary-100">
        <span className="block text-xs text-secondary-400 px-2">
          {roleLabel(role)}
        </span>
      </div>
    </aside>
  )
}

function SidebarSection({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function roleLabel(role: Role) {
  switch (role) {
    case 'STAFF':
      return 'Staff'
    case 'MANAGER':
      return 'Procurement Manager'
    case 'ADMIN':
      return 'System Admin'
  }
}
