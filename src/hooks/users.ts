import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type { Profile, UserRole } from '@/lib/database.types'

export interface UserRow extends Profile {
  companies: { name_ar: string; name_en: string | null } | null
}

export function useUsers() {
  const { isStaff } = useAuth()
  return useQuery({
    queryKey: ['users'],
    enabled: isStaff,
    queryFn: async (): Promise<UserRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(name_ar, name_en)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as UserRow[]
    },
  })
}

export interface InviteUserInput {
  email: string
  fullName: string
  role: UserRole
  companyId?: string | null
  phone?: string | null
}

/**
 * Creating a login needs the service role key, which must never ship in a
 * browser bundle. The `invite-user` edge function holds it and re-derives the
 * caller's permissions from the database, so this hook only carries intent —
 * lying about the role here changes nothing.
 */
export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: input.email,
          full_name: input.fullName,
          role: input.role,
          company_id: input.companyId ?? null,
          phone: input.phone ?? null,
          // Where the invite link lands once they set a password.
          redirect_to: `${window.location.origin}/login`,
        },
      })

      // functions.invoke surfaces a non-2xx as a generic FunctionsHttpError and
      // buries the body, so dig the Arabic message out rather than showing
      // "Edge Function returned a non-2xx status code" to an operator.
      if (error) {
        const res = (error as { context?: Response }).context
        if (res) {
          const detail = await res.json().catch(() => null)
          if (detail?.error) throw new Error(String(detail.error))
        }
        throw error
      }
      if (data?.error) throw new Error(String(data.error))
      return data as { user_id: string; email: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

/** Admin-only by the profiles guard trigger; the UI mirrors that. */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      role?: UserRole
      companyId?: string | null
      isActive?: boolean
    }) => {
      const payload: Record<string, unknown> = {}
      if (input.role !== undefined) payload.role = input.role
      if (input.companyId !== undefined) payload.company_id = input.companyId
      if (input.isActive !== undefined) payload.is_active = input.isActive

      // RLS restricts UPDATE on someone else's row to is_admin(). A denied
      // update is not an error in PostgREST — it simply matches zero rows — so
      // ask for the row back and treat an empty result as the refusal it is,
      // rather than showing a success toast for a change that never happened.
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', input.id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('تعديل المستخدمين مخصّص لمدير النظام')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
