'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import { FiSearch } from 'react-icons/fi'

export default function ProductSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const sp = new URLSearchParams(params.toString())
    if (q.trim()) sp.set('q', q.trim())
    else sp.delete('q')
    router.push(`/products${sp.toString() ? '?' + sp.toString() : ''}`)
  }

  return (
    <form onSubmit={submit} className="relative">
      <FiSearch className="absolute top-1/2 -translate-y-1/2 right-3 text-secondary-400" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحثي عن منتج، ماركة، أو صنف…"
        className="pr-9"
      />
    </form>
  )
}
