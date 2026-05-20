'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'

export default function ApprovalActions({ cartId }: { cartId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const approve = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cart/${cartId}/approve`, { method: 'POST' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const reject = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cart/${cartId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        setRejectOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)} disabled={loading}>
        Reject
      </Button>
      <Button variant="success" size="sm" onClick={approve} disabled={loading}>
        Approve
      </Button>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this cart?"
        description="The requester will see your reason."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={reject} disabled={loading}>
              Confirm reject
            </Button>
          </>
        }
      >
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. quantity too high, please re-submit with fewer units"
        />
      </Modal>
    </div>
  )
}
