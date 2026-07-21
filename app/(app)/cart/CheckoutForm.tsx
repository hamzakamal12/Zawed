'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label, Textarea } from '@/components/ui/Input'
import { FiCheckCircle } from 'react-icons/fi'

interface Prefill {
  name: string
  phone: string
  city: string
  address: string
}

export default function CheckoutForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState(prefill.name)
  const [customerPhone, setCustomerPhone] = useState(prefill.phone)
  const [shippingCity, setShippingCity] = useState(prefill.city)
  const [shippingAddress, setShippingAddress] = useState(prefill.address)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerPhone, shippingCity, shippingAddress, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'تعذّر إتمام الطلب')
        setLoading(false)
        return
      }
      router.push(`/orders/${data.orderId}?placed=1`)
    } catch {
      setError('خطأ في الاتصال')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="cName">الاسم الكامل</Label>
        <Input id="cName" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="cPhone">رقم الهاتف</Label>
        <Input id="cPhone" type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="09xxxxxxxx" />
      </div>
      <div>
        <Label htmlFor="cCity">المدينة</Label>
        <Input id="cCity" required value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="الخرطوم" />
      </div>
      <div>
        <Label htmlFor="cAddr">العنوان بالتفصيل</Label>
        <Textarea id="cAddr" required rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="الحي، الشارع، أقرب علامة مميزة…" />
      </div>
      <div>
        <Label htmlFor="cNotes">ملاحظات (اختياري)</Label>
        <Textarea id="cNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        <FiCheckCircle /> {loading ? 'جارٍ التأكيد…' : 'تأكيد الطلب (الدفع عند الاستلام)'}
      </Button>
    </form>
  )
}
