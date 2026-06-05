import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { ReputationBadge } from './ReputationBadge'

interface AnalystCardProps {
  user: {
    id: string
    name: string
    username: string
    avatarUrl?: string | null
    bio?: string | null
    role: string
    reputationScore: number
    predictionAccuracy: number
    totalPredictions: number
    isVerified: boolean
    _count?: { followers: number; posts: number }
  }
  isFollowing?: boolean
}

const roleLabel: Record<string, string> = {
  VERIFIED_ANALYST: 'محلل موثق',
  ANALYST: 'محلل',
  USER: 'عضو',
  ADMIN: 'مشرف',
}

export function AnalystCard({ user }: AnalystCardProps) {
  return (
    <Link href={`/profile/${user.username}`}>
      <div className="card p-4 hover:border-primary-500/30 transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-100 font-semibold">{user.name}</span>
              {user.isVerified && <span className="text-primary-400 text-sm" title="محلل موثق">✓</span>}
              <span className="text-xs text-slate-500">{roleLabel[user.role] ?? 'عضو'}</span>
            </div>
            <div className="text-slate-500 text-xs mb-1">@{user.username}</div>
            {user.bio && <p className="text-slate-400 text-sm line-clamp-2 mb-2">{user.bio}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <ReputationBadge score={user.reputationScore} showLabel />
              {user.totalPredictions > 0 && (
                <span className="text-xs text-slate-500">
                  دقة التوقعات: <span className="text-bull-400 font-medium">{user.predictionAccuracy.toFixed(0)}%</span>
                </span>
              )}
              {user._count && (
                <>
                  <span className="text-xs text-slate-500">{user._count.followers.toLocaleString()} متابع</span>
                  <span className="text-xs text-slate-500">{user._count.posts.toLocaleString()} منشور</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
