import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Company, Profile } from '@/lib/database.types'

interface AuthValue {
  session: Session | null
  profile: Profile | null
  company: Company | null
  loading: boolean
  isStaff: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setCompany(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load the profile (and its company) whenever the signed-in user changes.
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    let active = true
    setLoading(true)
    ;(async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!active) return
      setProfile(prof ?? null)

      if (prof?.company_id) {
        const { data: comp } = await supabase
          .from('companies')
          .select('*')
          .eq('id', prof.company_id)
          .maybeSingle()
        if (active) setCompany(comp ?? null)
      } else {
        setCompany(null)
      }
      if (active) setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  const value = useMemo<AuthValue>(() => {
    const role = profile?.role
    return {
      session,
      profile,
      company,
      loading,
      isStaff: role === 'admin' || role === 'sales' || role === 'warehouse',
      isAdmin: role === 'admin',
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }
  }, [session, profile, company, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
