import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthProvider'
import { CartProvider } from '@/context/CartProvider'
import { I18nProvider, useI18n } from '@/i18n/I18nProvider'
import { isConfigured } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { Skeleton } from '@/components/ui'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import CatalogPage from '@/pages/CatalogPage'
import ProductPage from '@/pages/ProductPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrdersPage from '@/pages/OrdersPage'
import OrderDetailPage from '@/pages/OrderDetailPage'

// Staff screens are code-split — customers on 3G never download them.
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminFxPage = lazy(() => import('@/pages/admin/AdminFxPage'))
const QuotationsPage = lazy(() => import('@/pages/admin/QuotationsPage'))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'))
// Customer-side extras are split too — most sessions never open them.
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const RecurringPage = lazy(() => import('@/pages/RecurringPage'))
const RequestQuotePage = lazy(() => import('@/pages/RequestQuotePage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AdminCatalogPage = lazy(() => import('@/pages/admin/AdminCatalogPage'))
const AccountRequestsPage = lazy(() => import('@/pages/admin/AccountRequestsPage'))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function PageFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32" />
    </div>
  )
}

function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireStaff() {
  const { isStaff, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!isStaff) return <Navigate to="/catalog" replace />
  return <Outlet />
}

function FullScreenLoading() {
  const { t } = useI18n()
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 bg-brand-gradient animate-pulse place-items-center rounded-xl text-lg font-extrabold text-white">
          ز
        </div>
        <span className="text-sm text-muted">{t('loading')}</span>
      </div>
    </div>
  )
}

/** Shown when .env is missing, instead of a blank crash. */
function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6" dir="ltr">
      <div className="max-w-md rounded-xl border border-status-warning/45 bg-status-warning/12 p-6 text-sm text-[#8a5d00]">
        <h1 className="mb-2 text-lg font-extrabold">Supabase is not configured</h1>
        <p>
          Copy <code className="rounded bg-white px-1">.env.example</code> to{' '}
          <code className="rounded bg-white px-1">.env</code> and set{' '}
          <code className="rounded bg-white px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code>, then restart the
          dev server.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <I18nProvider>
        <SetupNotice />
      </I18nProvider>
    )
  }

  return (
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<Lazy><RegisterPage /></Lazy>} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/catalog/:id" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/invoices" element={<Lazy><InvoicesPage /></Lazy>} />
                  <Route path="/approvals" element={<Lazy><ApprovalsPage /></Lazy>} />
                  <Route path="/recurring" element={<Lazy><RecurringPage /></Lazy>} />
                  <Route path="/quote-requests" element={<Lazy><RequestQuotePage /></Lazy>} />

                  <Route element={<RequireStaff />}>
                    <Route
                      path="/admin"
                      element={
                        <Suspense fallback={<PageFallback />}>
                          <AdminDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/orders"
                      element={
                        <Suspense fallback={<PageFallback />}>
                          <AdminOrdersPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/fx"
                      element={
                        <Suspense fallback={<PageFallback />}>
                          <AdminFxPage />
                        </Suspense>
                      }
                    />
                    <Route path="/admin/quotations" element={<Lazy><QuotationsPage /></Lazy>} />
                    <Route path="/admin/reports" element={<Lazy><ReportsPage /></Lazy>} />
                    <Route path="/admin/catalog" element={<Lazy><AdminCatalogPage /></Lazy>} />
                    <Route path="/admin/account-requests" element={<Lazy><AccountRequestsPage /></Lazy>} />
                  </Route>

                  <Route path="*" element={<Navigate to="/catalog" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
