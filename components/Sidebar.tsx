'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FiHome,
  FiGrid,
  FiShoppingBag,
  FiClipboard,
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
  { href: '/dashboard', label: 'الرئيسية', icon: <FiHome />, roles: ['CUSTOMER', 'ADMIN'] },
  { href: '/products', label: 'المتجر', icon: <FiGrid />, roles: ['CUSTOMER', 'ADMIN'] },
  { href: '/cart', label: 'سلة التسوق', icon: <FiShoppingBag />, roles: ['CUSTOMER', 'ADMIN'] },
  { href: '/orders', label: 'طلباتي', icon: <FiClipboard />, roles: ['CUSTOMER', 'ADMIN'] },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'لوحة الإدارة', icon: <FiSettings />, roles: ['ADMIN'] },
  { href: '/admin/products', label: 'إدارة المنتجات', icon: <FiBox />, roles: ['ADMIN'] },
  { href: '/admin/orders', label: 'كل الطلبات', icon: <FiClipboard />, roles: ['ADMIN'] },
  { href: '/admin/users', label: 'العملاء', icon: <FiUsers />, roles: ['ADMIN'] },
]

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = NAV.filter((i) => i.roles.includes(role))
  const adminItems = ADMIN_NAV.filter((i) => i.roles.includes(role))

  return (
    <aside className="w-60 border-l border-secondary-200 bg-white flex-shrink-0 h-screen sticky top-0 hidden md:flex flex-col">
      <div className="p-4 border-b border-secondary-100 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
          ز
        </div>
        <div className="leading-tight">
          <span className="font-extrabold block">زوّد بيوتي</span>
          <span className="text-[11px] text-secondary-400">مستحضرات التجميل</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <SidebarSection items={items} pathname={pathname} />
        {adminItems.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-secondary-400">
              الإدارة
            </div>
            <SidebarSection items={adminItems} pathname={pathname} />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-secondary-100">
        <span className="block text-xs text-secondary-400 px-2">{roleLabel(role)}</span>
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
  return role === 'ADMIN' ? 'مدير المتجر' : 'عميل'
}
