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
  FiGlobe,
  FiChevronRight,
} from 'react-icons/fi'
import type { Role } from '@prisma/client'
import { useMessages } from '@/components/LocaleProvider'
import type { Messages } from '@/lib/i18n'

type NavKey = keyof Messages['nav']

interface NavItem {
  href: string
  navKey: NavKey
  icon: React.ReactNode
  roles: Role[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', navKey: 'dashboard', icon: <FiHome />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/products', navKey: 'catalog', icon: <FiPackage />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/cart', navKey: 'myCart', icon: <FiShoppingCart />, roles: ['STAFF', 'MANAGER'] },
  { href: '/approvals', navKey: 'approvals', icon: <FiCheckSquare />, roles: ['MANAGER', 'ADMIN'] },
  { href: '/orders', navKey: 'orders', icon: <FiClipboard />, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { href: '/subscriptions', navKey: 'subscriptions', icon: <FiRepeat />, roles: ['MANAGER', 'ADMIN'] },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', navKey: 'overview', icon: <FiSettings />, roles: ['ADMIN'] },
  { href: '/admin/organizations', navKey: 'organizations', icon: <FiGlobe />, roles: ['ADMIN'] },
  { href: '/admin/products', navKey: 'products', icon: <FiBox />, roles: ['ADMIN'] },
  { href: '/admin/orders', navKey: 'allOrders', icon: <FiClipboard />, roles: ['ADMIN'] },
  { href: '/admin/users', navKey: 'users', icon: <FiUsers />, roles: ['ADMIN'] },
]

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const m = useMessages()
  const items = NAV.filter((i) => i.roles.includes(role))
  const adminItems = ADMIN_NAV.filter((i) => i.roles.includes(role))

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-white border-e border-secondary-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-secondary-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-brand-blue text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
            Z
          </div>
          <div>
            <span className="font-extrabold text-secondary-900 text-base tracking-tight">Zawed</span>
            <div className="text-[10px] text-secondary-400 font-medium -mt-0.5 uppercase tracking-widest">
              Procurement
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold text-secondary-400 uppercase tracking-widest">
          {m.nav.main}
        </p>
        <SidebarSection items={items} pathname={pathname} m={m} />

        {adminItems.length > 0 && (
          <>
            <div className="my-4 border-t border-secondary-100" />
            <p className="px-3 mb-2 text-[10px] font-semibold text-secondary-400 uppercase tracking-widest">
              {m.nav.admin}
            </p>
            <SidebarSection items={adminItems} pathname={pathname} m={m} />
          </>
        )}
      </nav>

      {/* User role badge */}
      <div className="px-4 py-4 border-t border-secondary-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary-50">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {roleInitial(role)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-secondary-700 truncate">{roleLabel(role, m)}</div>
            <div className="text-[10px] text-secondary-400">{m.nav.activeSession}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({
  items,
  pathname,
  m,
}: {
  items: NavItem[]
  pathname: string
  m: Messages
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900',
              )}
            >
              <span
                className={cn(
                  'text-base flex-shrink-0 transition-transform duration-150',
                  active ? 'text-white' : 'text-secondary-400 group-hover:text-secondary-600',
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">{m.nav[item.navKey]}</span>
              {active && <FiChevronRight className="text-white/70 text-xs rtl:rotate-180" />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function roleLabel(role: Role, m: Messages) {
  switch (role) {
    case 'STAFF': return m.nav.staffMember
    case 'MANAGER': return m.nav.procurementManager
    case 'ADMIN': return m.nav.systemAdmin
  }
}

function roleInitial(role: Role) {
  switch (role) {
    case 'STAFF': return 'S'
    case 'MANAGER': return 'M'
    case 'ADMIN': return 'A'
  }
}
