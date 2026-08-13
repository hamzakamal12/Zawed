import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Languages,
  Gauge,
  Coins,
  Package,
  WifiOff,
  FileQuestion,
  FileText,
  Receipt,
  Repeat,
  Inbox,
  BarChart3,
  Boxes,
  Building2,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthProvider'
import { useCart } from '@/context/CartProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOrderQueue } from '@/hooks/useOrderQueue'
import { Button } from './ui'

export default function AppShell() {
  const { t, toggleLang, pick } = useI18n()
  const { profile, company, isStaff, isAdmin, signOut } = useAuth()
  const isCompanyAdmin = profile?.role === 'customer_admin'
  const { count } = useCart()
  const online = useOnlineStatus()
  const queue = useOrderQueue()
  const navigate = useNavigate()

  // Bottom bar on mobile stays at four items; the rest live in the sidebar.
  const customerNav = [
    { to: '/catalog', label: t('nav_catalog'), icon: LayoutGrid },
    { to: '/cart', label: t('nav_cart'), icon: ShoppingCart, badge: count },
    { to: '/orders', label: t('nav_orders'), icon: ClipboardList },
  ]
  const secondaryNav = [
    { to: '/quote-requests', label: t('nav_requests'), icon: FileQuestion },
    { to: '/invoices', label: t('nav_invoices'), icon: Receipt },
    { to: '/recurring', label: t('nav_recurring'), icon: Repeat },
    ...(isCompanyAdmin ? [{ to: '/approvals', label: t('nav_approvals'), icon: Inbox }] : []),
  ]
  const staffNav = [
    { to: '/admin', label: t('nav_dashboard'), icon: Gauge },
    { to: '/admin/orders', label: t('nav_admin_orders'), icon: Package },
    { to: '/admin/quotations', label: t('nav_quotations'), icon: FileText },
    { to: '/admin/reports', label: t('nav_reports'), icon: BarChart3 },
    { to: '/admin/account-requests', label: t('nav_account_requests'), icon: Building2 },
    ...(isAdmin ? [{ to: '/admin/catalog', label: t('nav_catalog_admin'), icon: Boxes }] : []),
    ...(isAdmin ? [{ to: '/admin/fx', label: t('nav_admin_fx'), icon: Coins }] : []),
  ]

  const onSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Dark ink on amber, not white: white on amber-500 measures ~2.1:1 and
          this strip carries the one message a user must not miss. */}
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-status-warning px-4 py-2 text-sm font-bold text-[#4a3400]">
          <WifiOff size={16} />
          {t('offline')}
          {queue.count > 0 && <span>· {t('queued_count', { n: queue.count })}</span>}
        </div>
      )}
      {online && queue.flushing && (
        <div className="bg-primary-700 px-4 py-2 text-center text-sm font-semibold text-white">
          {t('sending_queued')}
        </div>
      )}

      <div className="flex">
        {/* Sidebar — desktop only */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-line bg-white md:flex">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
            <div className="bg-brand-gradient grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold text-white shadow-sm">
              ز
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-ink">{t('brand')}</div>
              <div className="text-[11px] text-muted">{t('tagline')}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {customerNav.map((item) => (
              <SideLink key={item.to} {...item} />
            ))}
            <NavGroup>{t('nav_documents')}</NavGroup>
            {secondaryNav.map((item) => (
              <SideLink key={item.to} {...item} />
            ))}
            {isStaff && (
              <>
                <NavGroup>{t('nav_admin')}</NavGroup>
                {staffNav.map((item) => (
                  <SideLink key={item.to} {...item} />
                ))}
              </>
            )}
          </nav>

          <div className="flex items-center gap-2.5 border-t border-line p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-extrabold text-primary-700">
              {initials(profile?.full_name)}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold text-ink">
                {profile?.full_name ?? '—'}
              </div>
              <div className="truncate text-[11px] text-muted">
                {company ? pick(company.name_ar, company.name_en) : t('nav_admin')}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-white/85 px-4 backdrop-blur">
            <div className="flex items-center gap-2 md:hidden">
              <div className="bg-brand-gradient grid h-8 w-8 place-items-center rounded-lg text-xs font-extrabold text-white">
                ز
              </div>
              <span className="text-sm font-extrabold text-ink">{t('brand')}</span>
            </div>
            <div className="hidden md:block" />

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={toggleLang} title="language">
                <Languages size={16} />
                {t('language')}
              </Button>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('sign_out')}</span>
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white md:hidden">
        {customerNav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold',
                isActive ? 'text-primary-700' : 'text-muted',
              )
            }
          >
            <Icon size={20} />
            {label}
            {Boolean(badge) && (
              <span className="absolute top-1 ms-6 grid h-4 min-w-4 place-items-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
        {isStaff && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold',
                isActive ? 'text-primary-700' : 'text-muted',
              )
            }
          >
            <Gauge size={20} />
            {t('nav_admin')}
          </NavLink>
        )}
      </nav>
    </div>
  )
}

function NavGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-wide text-muted">
      {children}
    </div>
  )
}

/** First letters of the first two words — works for Arabic and Latin names alike. */
function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts.slice(0, 2).map((p) => [...p][0]).join('')
}

function SideLink({
  to,
  label,
  icon: Icon,
  badge,
}: {
  to: string
  label: string
  icon: typeof LayoutGrid
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-muted hover:bg-canvas hover:text-ink',
        )
      }
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {Boolean(badge) && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
