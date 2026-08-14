import { useMemo, useState } from 'react'
import { Mail, Plus, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useInviteUser, useUpdateUser, useUsers, type UserRow } from '@/hooks/users'
import { useCompanies } from '@/hooks/documents'
import { useAuth } from '@/context/AuthProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, normalizeArabic } from '@/lib/format'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Notice,
  Select,
  Skeleton,
} from '@/components/ui'
import type { UserRole } from '@/lib/database.types'
import type { StringKey } from '@/i18n/strings'

const STAFF_ROLES: UserRole[] = ['admin', 'sales', 'warehouse']
const CUSTOMER_ROLES: UserRole[] = ['customer_admin', 'customer_requester']

const ROLE_KEY: Record<UserRole, StringKey> = {
  admin: 'role_admin',
  sales: 'role_sales',
  warehouse: 'role_warehouse',
  customer_admin: 'role_customer_admin',
  customer_requester: 'role_customer_requester',
}

/**
 * User administration.
 *
 * Two rules the screen exists to make visible, both of which are ALSO enforced
 * server-side — here they only stop an operator from attempting something that
 * will be refused:
 *
 *   · creating a login needs the service role key, so the invite goes through
 *     the invite-user edge function, never straight from the browser;
 *   · only an admin may change a role, a company or an active flag — the
 *     profiles guard trigger raises if anyone else tries.
 *
 * Non-admin staff still get the list, because knowing who has an account is
 * part of doing their job; they just cannot change any of it.
 */
export default function AdminUsersPage() {
  const { t, pick } = useI18n()
  const { isAdmin, profile } = useAuth()
  const users = useUsers()
  const companies = useCompanies()
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState(false)

  const companyOptions = useMemo(
    () => (companies.data ?? []).map((c) => ({ id: c.id, label: pick(c.name_ar, c.name_en) })),
    [companies.data, pick],
  )

  const rows = useMemo(() => {
    const needle = normalizeArabic(search)
    const all = users.data ?? []
    if (!needle) return all
    return all.filter((u) =>
      normalizeArabic(
        `${u.full_name ?? ''} ${u.email ?? ''} ${u.phone ?? ''} ${u.companies?.name_ar ?? ''}`,
      ).includes(needle),
    )
  }, [users.data, search])

  const staff = rows.filter((u) => STAFF_ROLES.includes(u.role))
  const customers = rows.filter((u) => CUSTOMER_ROLES.includes(u.role))

  if (users.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('users_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('users_subtitle')}</p>
        </div>
        <Button onClick={() => setInviting((v) => !v)}>
          {inviting ? <X size={16} /> : <Plus size={16} />}
          {inviting ? t('cancel') : t('users_invite')}
        </Button>
      </div>

      {!isAdmin && <Notice tone="info">{t('users_readonly')}</Notice>}

      {inviting && (
        <InviteForm
          companies={companyOptions}
          canMintStaff={isAdmin}
          onDone={() => setInviting(false)}
        />
      )}

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted start-3"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('users_search')}
          className="h-12 ps-10"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users size={30} />} title={t('no_results')} />
      ) : (
        <div className="space-y-6">
          <Section
            title={t('users_staff')}
            count={staff.length}
            rows={staff}
            companies={companyOptions}
            canEdit={isAdmin}
            selfId={profile?.id ?? null}
          />
          <Section
            title={t('users_customers')}
            count={customers.length}
            rows={customers}
            companies={companyOptions}
            canEdit={isAdmin}
            selfId={profile?.id ?? null}
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Section({
  title,
  count,
  rows,
  companies,
  canEdit,
  selfId,
}: {
  title: string
  count: number
  rows: UserRow[]
  companies: { id: string; label: string }[]
  canEdit: boolean
  selfId: string | null
}) {
  if (count === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-muted">
        {title}
        <span dir="ltr">({count})</span>
      </div>
      {rows.map((u) => (
        <UserCard key={u.id} user={u} companies={companies} canEdit={canEdit} isSelf={u.id === selfId} />
      ))}
    </div>
  )
}

function UserCard({
  user,
  companies,
  canEdit,
  isSelf,
}: {
  user: UserRow
  companies: { id: string; label: string }[]
  canEdit: boolean
  isSelf: boolean
}) {
  const { t, lang, pick } = useI18n()
  const update = useUpdateUser()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<UserRole>(user.role)
  const [companyId, setCompanyId] = useState(user.company_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isCustomerRole = CUSTOMER_ROLES.includes(role)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    setSaved(false)
    try {
      await fn()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink" dir="auto">
                {user.full_name || t('users_no_name')}
              </span>
              <Badge tone={user.role === 'admin' ? 'info' : 'neutral'}>
                {t(ROLE_KEY[user.role])}
              </Badge>
              {!user.is_active && <Badge tone="danger">{t('users_disabled')}</Badge>}
              {isSelf && <Badge tone="neutral">{t('users_you')}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <Mail size={13} className="shrink-0" />
              <span dir="ltr">{user.email ?? '—'}</span>
              {user.phone && (
                <>
                  <span>·</span>
                  <span dir="ltr">{user.phone}</span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {user.companies ? pick(user.companies.name_ar, user.companies.name_en) : t('users_no_company')}
              {' · '}
              {formatDate(user.created_at, lang)}
            </div>
          </div>

          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? t('close') : t('users_manage')}
            </Button>
          )}
        </div>

        {canEdit && open && (
          <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('users_role')}</Label>
                <Select
                  value={role}
                  onChange={(e) => {
                    const next = e.target.value as UserRole
                    setRole(next)
                    // Staff are never attached to a company; clearing here keeps
                    // the form from submitting a combination the server rejects.
                    if (STAFF_ROLES.includes(next)) setCompanyId('')
                  }}
                  disabled={isSelf}
                >
                  {[...STAFF_ROLES, ...CUSTOMER_ROLES].map((r) => (
                    <option key={r} value={r}>
                      {t(ROLE_KEY[r])}
                    </option>
                  ))}
                </Select>
              </div>
              {isCustomerRole && (
                <div>
                  <Label>{t('users_company')}</Label>
                  <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                    <option value="">—</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {/* Demoting yourself can leave the platform with no admin at all,
                and you would not be able to undo it. */}
            {isSelf && <p className="text-xs text-muted">{t('users_self_note')}</p>}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={update.isPending || isSelf || (isCustomerRole && !companyId)}
                onClick={() =>
                  run(() =>
                    update.mutateAsync({
                      id: user.id,
                      role,
                      companyId: isCustomerRole ? companyId : null,
                    }),
                  )
                }
              >
                <ShieldCheck size={15} />
                {update.isPending ? t('loading') : t('save')}
              </Button>
              <Button
                variant={user.is_active ? 'ghost' : 'success'}
                size="sm"
                disabled={update.isPending || isSelf}
                onClick={() =>
                  run(() => update.mutateAsync({ id: user.id, isActive: !user.is_active }))
                }
              >
                {user.is_active ? t('users_disable') : t('users_enable')}
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-muted">{t('users_disable_note')}</p>

            {saved && <Notice tone="success">{t('users_saved')}</Notice>}
            {error && <Notice tone="danger">{error}</Notice>}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function InviteForm({
  companies,
  canMintStaff,
  onDone,
}: {
  companies: { id: string; label: string }[]
  canMintStaff: boolean
  onDone: () => void
}) {
  const { t } = useI18n()
  const invite = useInviteUser()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('customer_requester')
  const [companyId, setCompanyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  // Only an admin may create staff. Mirrors the check in the edge function,
  // which is the one that actually counts.
  const roleOptions = canMintStaff ? [...STAFF_ROLES, ...CUSTOMER_ROLES] : CUSTOMER_ROLES
  const isCustomerRole = CUSTOMER_ROLES.includes(role)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSent(null)
    try {
      const res = await invite.mutateAsync({
        email,
        fullName,
        role,
        phone: phone || null,
        companyId: isCustomerRole ? companyId : null,
      })
      setSent(res.email)
      setEmail('')
      setFullName('')
      setPhone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-1">{t('users_invite')}</CardTitle>
        <p className="mb-4 text-sm text-muted">{t('users_invite_note')}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t('users_email')}</Label>
              <Input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.sd"
              />
            </div>
            <div>
              <Label>{t('users_full_name')}</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label hint={t('optional')}>{t('reg_phone')}</Label>
              <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>{t('users_role')}</Label>
              <Select
                value={role}
                onChange={(e) => {
                  const next = e.target.value as UserRole
                  setRole(next)
                  if (STAFF_ROLES.includes(next)) setCompanyId('')
                }}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {t(ROLE_KEY[r])}
                  </option>
                ))}
              </Select>
            </div>
            {isCustomerRole && (
              <div className="sm:col-span-2">
                <Label>{t('users_company')}</Label>
                <Select required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">—</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-muted">{t('users_company_note')}</p>
              </div>
            )}
          </div>

          {sent && (
            <Notice tone="success">
              {t('users_invite_sent', { email: sent })}
            </Notice>
          )}
          {error && <Notice tone="danger">{error}</Notice>}

          <div className="flex gap-2">
            <Button type="submit" disabled={invite.isPending || (isCustomerRole && !companyId)}>
              <UserPlus size={15} />
              {invite.isPending ? t('loading') : t('users_send_invite')}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
