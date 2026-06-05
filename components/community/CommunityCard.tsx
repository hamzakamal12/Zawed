import Link from 'next/link'

interface CommunityCardProps {
  community: {
    id: string
    name: string
    slug: string
    description?: string | null
    category: string
    memberCount: number
    postCount: number
  }
  isMember?: boolean
}

const categoryEmoji: Record<string, string> = {
  CRYPTO: '₿',
  STOCKS: '📈',
  REAL_ESTATE: '🏠',
  FOREX: '💱',
  COMMODITIES: '🥇',
  STARTUPS: '🚀',
  GENERAL: '💡',
}

const categoryColor: Record<string, string> = {
  CRYPTO: 'text-primary-400 bg-primary-500/10',
  STOCKS: 'text-bull-400 bg-bull-500/10',
  REAL_ESTATE: 'text-blue-400 bg-blue-500/10',
  FOREX: 'text-purple-400 bg-purple-500/10',
  COMMODITIES: 'text-yellow-400 bg-yellow-500/10',
  STARTUPS: 'text-orange-400 bg-orange-500/10',
  GENERAL: 'text-slate-300 bg-slate-700/40',
}

export function CommunityCard({ community, isMember }: CommunityCardProps) {
  const emoji = categoryEmoji[community.category] ?? '💡'
  const color = categoryColor[community.category] ?? categoryColor.GENERAL

  return (
    <Link href={`/communities/${community.slug}`}>
      <div className="card p-4 hover:border-primary-500/30 hover:bg-surface-2 transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-slate-100 font-semibold text-base">{community.name}</h3>
              {isMember && (
                <span className="text-xs text-bull-400 bg-bull-500/10 px-1.5 py-0.5 rounded-full">عضو</span>
              )}
            </div>
            {community.description && (
              <p className="text-slate-400 text-sm mt-1 line-clamp-2">{community.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>👥 {community.memberCount.toLocaleString()} عضو</span>
              <span>📝 {community.postCount.toLocaleString()} منشور</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
