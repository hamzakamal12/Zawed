'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

export default function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const q = params.get('q') ?? ''

  const update = useCallback(
    (value: string) => {
      const sp = new URLSearchParams(params.toString())
      if (value) sp.set('q', value)
      else sp.delete('q')
      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`)
      })
    },
    [router, pathname, params],
  )

  return (
    <div className="relative w-full max-w-sm">
      <FiSearch className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isPending ? 'text-primary-500 animate-pulse' : 'text-secondary-400'}`} />
      <input
        type="search"
        defaultValue={q}
        onChange={(e) => update(e.target.value)}
        placeholder="ابحث عن منتج أو SKU…"
        className="w-full rounded-xl border border-secondary-200 bg-white py-2 pr-9 pl-9 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
      />
      {q && (
        <button
          onClick={() => update('')}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          aria-label="Clear search"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
