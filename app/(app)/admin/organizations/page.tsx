import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import AdminOrgActions from './AdminOrgActions'

const NGO_TYPE_LABELS: Record<string, string> = {
  CHARITY: 'Charity',
  FOUNDATION: 'Foundation',
  HUMANITARIAN: 'Humanitarian',
  EDUCATIONAL: 'Educational',
  HEALTH: 'Health',
  ENVIRONMENTAL: 'Environmental',
  OTHER: 'Other',
}

export default async function AdminOrganizationsPage() {
  await requireRole(['ADMIN'])

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Organizations</h1>
        <p className="text-secondary-500 mt-1">
          Manage NGO verification and special pricing for all registered organizations.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-medium uppercase text-secondary-500">Total NGOs</div>
            <div className="text-2xl font-bold mt-1">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-medium uppercase text-secondary-500">Verified</div>
            <div className="text-2xl font-bold mt-1 text-green-700">
              {companies.filter((c) => c.verified).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-medium uppercase text-secondary-500">Pending Verification</div>
            <div className="text-2xl font-bold mt-1 text-yellow-600">
              {companies.filter((c) => !c.verified).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reg. #</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Users / Orders</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Discount & Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-secondary-50 align-middle">
                  <td className="py-3 px-4">
                    <div className="font-medium">{c.name}</div>
                    {c.email && (
                      <div className="text-xs text-secondary-500">{c.email}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-secondary-600">
                    {c.ngoType ? NGO_TYPE_LABELS[c.ngoType] ?? c.ngoType : '—'}
                  </td>
                  <td className="py-3 px-4 text-secondary-600">
                    {c.registrationNumber ?? '—'}
                  </td>
                  <td className="py-3 px-4">
                    {c.verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-secondary-600">
                    {c._count.users} / {c._count.orders}
                  </td>
                  <td className="py-3 px-4 text-secondary-600">{formatDate(c.createdAt)}</td>
                  <td className="py-3 px-4">
                    <AdminOrgActions
                      companyId={c.id}
                      verified={c.verified}
                      ngoDiscount={Number(c.ngoDiscount)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
