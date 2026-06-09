import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'

const getTrendingData = unstable_cache(
  async () => {
    const [topCommunities, topAnalysts] = await Promise.all([
      prisma.community.findMany({
        take: 4,
        orderBy: { memberCount: 'desc' },
        select: { id: true, name: true, slug: true, memberCount: true, category: true },
      }),
      prisma.user.findMany({
        take: 4,
        orderBy: { reputationScore: 'desc' },
        where: { reputationScore: { gt: 0 } },
        select: { id: true, name: true, username: true, reputationScore: true, isVerified: true },
      }),
    ])
    return { topCommunities, topAnalysts }
  },
  ['trending-widget'],
  { revalidate: 300 } // يُحدَّث كل 5 دقائق فقط
)

const categoryEmoji: Record<string, string> = {
  CRYPTO: '₿',
  STOCKS: '📈',
  REAL_ESTATE: '🏠',
  FOREX: '💱',
  COMMODITIES: '🥇',
  STARTUPS: '🚀',
  GENERAL: '💡',
}

export async function TrendingWidget() {
  const { topCommunities, topAnalysts } = await getTrendingData()

  return (
    <aside className="py-4 px-3 flex flex-col gap-6">
      {/* Top Communities */}
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          أكبر المجتمعات
        </h3>
        <div className="flex flex-col gap-1">
          {topCommunities.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <span className="text-lg">{categoryEmoji[c.category] ?? '💡'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">{c.name}</div>
                <div className="text-slate-500 text-xs">{c.memberCount.toLocaleString()} عضو</div>
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/communities"
          className="block text-center text-primary-400 text-xs mt-2 hover:text-primary-300 transition-colors"
        >
          عرض الكل ←
        </Link>
      </div>

      {/* Top Analysts */}
      {topAnalysts.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            أفضل المحللين
          </h3>
          <div className="flex flex-col gap-1">
            {topAnalysts.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-200 text-sm font-medium truncate">{u.name}</span>
                    {u.isVerified && <span title="محلل موثق">✓</span>}
                  </div>
                  <div className="text-slate-500 text-xs">@{u.username}</div>
                </div>
                <span className="text-primary-400 text-xs font-bold">
                  ★{u.reputationScore.toFixed(0)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-slate-600 text-xs px-1 mt-auto">
        © 2026 زاود — منصة التداول الاجتماعي
      </p>
    </aside>
  )
}
