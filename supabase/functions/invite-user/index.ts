/**
 * invite-user — the only way an account gets created.
 *
 * Creating a login requires the auth admin API, which requires the service
 * role key. That key can never reach a browser: this platform ships as a
 * static SPA, so anything in the bundle is readable by every visitor. So the
 * key lives here, on the server, and the browser calls this function instead.
 *
 * Two separate identities are in play and keeping them apart is the whole
 * security model of this file:
 *
 *   caller — a client built from the REQUEST's JWT. RLS applies to it, so it
 *            can only see what the signed-in user can see. Used ONLY to work
 *            out who is asking and what they are allowed to do.
 *   admin  — a client built from the service role key. Bypasses RLS entirely.
 *            Used ONLY after the caller has been authorised.
 *
 * Authorisation is decided from the caller's profile row in the database,
 * never from anything in the request body. A client that lies about its role
 * changes nothing.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

type Role = 'admin' | 'sales' | 'warehouse' | 'customer_admin' | 'customer_requester'

const STAFF_ROLES: Role[] = ['admin', 'sales', 'warehouse']
const CUSTOMER_ROLES: Role[] = ['customer_admin', 'customer_requester']
const ALL_ROLES: Role[] = [...STAFF_ROLES, ...CUSTOMER_ROLES]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'الدالة غير مهيّأة' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'يجب تسجيل الدخول' }, 401)

  // ── who is asking ────────────────────────────────────────────────
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: auth, error: authError } = await caller.auth.getUser()
  if (authError || !auth?.user) return json({ error: 'يجب تسجيل الدخول' }, 401)

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, is_active')
    .eq('id', auth.user.id)
    .maybeSingle()

  const callerRole = callerProfile?.role as Role | undefined
  if (!callerProfile?.is_active || !callerRole || !STAFF_ROLES.includes(callerRole)) {
    return json({ error: 'هذا الإجراء مخصّص لفريق العمل' }, 403)
  }

  // ── what is being asked ──────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'طلب غير صالح' }, 400)
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  const fullName = String(body.full_name ?? '').trim()
  const phone = body.phone ? String(body.phone).trim() : null
  const role = String(body.role ?? '') as Role
  const companyId = body.company_id ? String(body.company_id) : null

  if (!email.includes('@') || email.length < 5) return json({ error: 'بريد إلكتروني غير صالح' }, 400)
  if (fullName.length < 2) return json({ error: 'الاسم مطلوب' }, 400)
  if (!ALL_ROLES.includes(role)) return json({ error: 'دور غير معروف' }, 400)

  // Only an admin may mint staff. Without this, a `sales` account could
  // promote itself sideways by inviting a second admin it controls.
  if (STAFF_ROLES.includes(role) && callerRole !== 'admin') {
    return json({ error: 'إنشاء حسابات فريق العمل مخصّص لمدير النظام' }, 403)
  }
  // A customer account is meaningless without a company — auth_company_id()
  // would return null and RLS would show them nothing.
  if (CUSTOMER_ROLES.includes(role) && !companyId) {
    return json({ error: 'اختر المؤسسة لحساب العميل' }, 400)
  }
  if (STAFF_ROLES.includes(role) && companyId) {
    return json({ error: 'حسابات فريق العمل لا تُربط بمؤسسة' }, 400)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  if (companyId) {
    const { data: company } = await admin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .maybeSingle()
    if (!company) return json({ error: 'المؤسسة غير موجودة' }, 400)
  }

  // ── create the login, then the profile ───────────────────────────
  const redirectTo = String(body.redirect_to ?? '') || undefined
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName },
  })

  if (inviteError || !invited?.user) {
    const message = inviteError?.message ?? ''
    // Distinguish "already registered" so the operator knows to link the
    // existing account rather than assuming the invite silently failed.
    if (/already/i.test(message) || /registered/i.test(message)) {
      return json({ error: 'هذا البريد مسجَّل بالفعل' }, 409)
    }
    return json({ error: message || 'تعذّر إنشاء الحساب' }, 400)
  }

  // A user without a profile row can sign in and see nothing at all, so this
  // has to succeed. If it does not, remove the half-made login rather than
  // leaving an account that cannot be used and cannot be re-invited.
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: invited.user.id,
      full_name: fullName,
      // Mirrored from auth.users, which PostgREST cannot expose. Without it the
      // user list shows a name and a role but no way to tell which login that
      // is, and names are not unique.
      email,
      phone,
      role,
      company_id: companyId,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id).catch(() => {})
    return json({ error: `تعذّر إنشاء الملف الشخصي: ${profileError.message}` }, 500)
  }

  return json({ user_id: invited.user.id, email, role, company_id: companyId })
})
