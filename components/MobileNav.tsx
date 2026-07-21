'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FiHome, FiGrid, FiShoppingBag, FiClipboard } from 'react-icons/fi'

const ITEMS = [
  { href: '/dashboard', label: 'الرئيسية', icon: <FiHome /> },
  { href: '/products', label: 'المتجر', icon: <FiGrid /> },
  { href: '/cart', label: 'السلة', icon: <FiShoppingBag /> },
  { href: '/orders', label: 'طلباتي', icon: <FiClipboard /> },
]

export default function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-secondary-200 flex justify-around">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              active ? 'text-primary-600' : 'text-secondary-400',
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
