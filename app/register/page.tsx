'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input, { Label, Select } from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'company' | 'invite'>('company')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('ADMIN')
  const [companyCode, setCompanyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body = mode === 'company'
        ? {
            mode,
            companyName,
            companyAddress,
            taxId,
            name,
            email,
            password,
          }
        : { mode, companyCode, name, email, password, role }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-white to-secondary-50">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-primary-600 text-white flex items-center justify-center font-bold">
              Z
            </div>
            <span className="font-bold text-xl">Zawed</span>
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-secondary-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-secondary-900">Create your account</h1>
          <p className="text-sm text-secondary-500 mt-1">
            Register a new company or join an existing one.
          </p>

          <div className="mt-5 inline-flex rounded-md border border-secondary-200 p-1 bg-secondary-50">
            <button
              type="button"
              onClick={() => setMode('company')}
              className={`px-4 py-1.5 text-sm font-medium rounded ${
                mode === 'company' ? 'bg-white shadow text-secondary-900' : 'text-secondary-600'
              }`}
            >
              New company
            </button>
            <button
              type="button"
              onClick={() => setMode('invite')}
              className={`px-4 py-1.5 text-sm font-medium rounded ${
                mode === 'invite' ? 'bg-white shadow text-secondary-900' : 'text-secondary-600'
              }`}
            >
              Join existing
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'company' ? (
              <>
                <div>
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="address">Address (optional)</Label>
                    <Input
                      id="address"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxId">Tax ID (optional)</Label>
                    <Input
                      id="taxId"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="TAX-12345"
                    />
                  </div>
                </div>
                <p className="text-xs text-secondary-500">
                  You will be set up as the company's first <strong>Procurement Manager</strong>.
                </p>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="companyCode">Company code</Label>
                  <Input
                    id="companyCode"
                    required
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="Paste the code from your manager"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Procurement Manager</option>
                  </Select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="regEmail">Work email</Label>
                <Input
                  id="regEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="regPassword">Password</Label>
              <Input
                id="regPassword"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-secondary-600 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
