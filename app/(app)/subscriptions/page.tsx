import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import NewSubscriptionForm from './NewSubscriptionForm'
import SubscriptionToggle from './SubscriptionToggle'

export default async function SubscriptionsPage() {
  const session = await requireRole(['MANAGER', 'ADMIN'])

  const [subs, products] = await Promise.all([
    prisma.subscription.findMany({
      where: { companyId: session.companyId ?? undefined },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true },
    }),
  ])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Recurring orders</h1>
        <p className="text-secondary-500 mt-1">
          Save common pantry &amp; supply baskets as a weekly or monthly subscription.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create new recurring order</CardTitle>
        </CardHeader>
        <CardContent>
          <NewSubscriptionForm products={products} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <div className="py-12 text-center text-secondary-500">
              No subscriptions yet.
            </div>
          ) : (
            <ul className="divide-y divide-secondary-100">
              {subs.map((s) => (
                <li key={s.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-secondary-500 mt-0.5">
                      {s.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} ·{' '}
                      {s.items.length} item{s.items.length === 1 ? '' : 's'}
                      {s.nextRunAt && ` · next: ${formatDate(s.nextRunAt)}`}
                    </div>
                    <div className="text-xs text-secondary-500 mt-1">
                      {s.items.map((i) => `${i.product.name} × ${i.quantity}`).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Paused</Badge>
                    )}
                    <SubscriptionToggle id={s.id} active={s.active} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
