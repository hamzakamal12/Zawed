'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function SubscriptionToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const toggle = async () => {
    setLoading(true)
    try {
      await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {active ? 'Pause' : 'Resume'}
    </Button>
  )
}
