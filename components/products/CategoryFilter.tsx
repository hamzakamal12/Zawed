'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
}

export default function CategoryFilter({ categories }: { categories: Category[] }) {
  const params = useSearchParams()
  const pathname = usePathname()
  const current = params.get('category')

  const link = (slug?: string) => {
    const sp = new URLSearchParams(params.toString())
    if (slug) sp.set('category', slug)
    else sp.delete('category')
    const qs = sp.toString()
    return `${pathname}${qs ? '?' + qs : ''}`
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={link(undefined)}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          !current
            ? 'bg-primary-600 text-white'
            : 'bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-50',
        )}
      >
        الكل
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={link(c.slug)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            current === c.slug
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-50',
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  )
}
