import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/session'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export default async function AdminUsersPage() {
  await requireRole(['ADMIN'])
  const users = await prisma.user.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">العملاء</h1>
        <p className="text-secondary-500 mt-1">كل المسجّلين في المتجر.</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-secondary-500 border-b border-secondary-100">
                <th className="py-3 px-4">الاسم</th>
                <th className="py-3 px-4">البريد</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">المدينة</th>
                <th className="py-3 px-4">الطلبات</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-secondary-50">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-secondary-600">{u.email}</td>
                  <td className="py-3 px-4 text-secondary-600">{u.phone ?? '—'}</td>
                  <td className="py-3 px-4 text-secondary-600">{u.city ?? '—'}</td>
                  <td className="py-3 px-4 text-secondary-600">{u._count.orders}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>
                      {u.role === 'ADMIN' ? 'مدير' : 'عميل'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-secondary-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
