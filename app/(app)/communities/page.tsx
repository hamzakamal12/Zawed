import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { CommunityCard } from '@/components/community/CommunityCard'

export const dynamic = 'force-dynamic'

const categoryLabels: Record<string, string> = {
  CRYPTO: 'عملات رقمية',
  STOCKS: 'أسهم',
  REAL_ESTATE: 'عقارات',
  FOREX: 'فوركس',
  COMMODITIES: 'سلع',
  STARTUPS: 'مشاريع ناشئة',
  GENERAL: 'عام',
}

export default async function CommunitiesPage() {
  const session = await getSession()

  const communities = await prisma.community.findMany({
    orderBy: { memberCount: 'desc' },
  })

  let memberIds = new Set<string>()
  if (session) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId: session.sub },
      select: { communityId: true },
    })
    memberIds = new Set(memberships.map((m) => m.communityId))
  }

  // Group by category
  const grouped: Record<string, typeof communities> = {}
  for (const c of communities) {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category]!.push(c)
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-slate-100 font-bold text-2xl mb-2">المجتمعات</h1>
      <p className="text-slate-400 text-sm mb-6">انضم لمجتمعات تتوافق مع اهتماماتك الاستثمارية</p>

      {Object.entries(grouped).map(([category, list]) => (
        <section key={category} className="mb-8">
          <h2 className="text-slate-300 font-semibold text-base mb-3 flex items-center gap-2">
            <span>{categoryLabels[category] ?? category}</span>
            <span className="text-slate-600 text-sm">({list.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {list.map((c) => (
              <CommunityCard key={c.id} community={c} isMember={memberIds.has(c.id)} />
            ))}
          </div>
        </section>
      ))}

      {communities.length === 0 && (
        <div className="text-center py-16 text-slate-500">لا توجد مجتمعات بعد</div>
      )}
    </div>
  )
}
