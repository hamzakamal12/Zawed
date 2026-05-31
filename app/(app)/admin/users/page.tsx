import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export default async function AdminUsersPage() {
  await requireRole(['ADMIN'])
  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Users</h1>
        <p className="text-secondary-500 mt-1">Everyone with an account across all companies.</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-secondary-50">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-secondary-600">{u.email}</td>
                  <td className="py-3 px-4">{u.company?.name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        u.role === 'ADMIN' ? 'info' : u.role === 'MANAGER' ? 'success' : 'default'
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-secondary-600">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
