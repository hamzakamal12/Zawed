import { prisma } from '@/lib/db'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

const categoryEmoji: Record<string, string> = {
  CRYPTO: '₿', STOCKS: '📈', REAL_ESTATE: '🏠',
  FOREX: '💱', COMMODITIES: '🥇', STARTUPS: '🚀', GENERAL: '💡',
}

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: [{ isLive: 'desc' }, { participantCount: 'desc' }],
    include: { _count: { select: { messages: true } } },
  })

  return (
    <div className="px-4 py-6">
      <h1 className="text-slate-100 font-bold text-2xl mb-2">غرف النقاش</h1>
      <p className="text-slate-400 text-sm mb-6">
        ناقش السوق في الوقت الفعلي مع المتداولين والمحللين
      </p>

      {rooms.length === 0 ? (
        <EmptyState
          icon="💬"
          title="لا توجد غرف نشطة"
          description="سيتم إضافة غرف النقاش قريباً"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`}>
              <div className="card p-4 hover:border-primary-500/30 hover:bg-surface-2 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-2xl flex-shrink-0">
                    {categoryEmoji[room.category] ?? '💡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-slate-100 font-semibold">{room.name}</h3>
                      {room.isLive && (
                        <span className="flex items-center gap-1 text-xs text-bull-400 bg-bull-500/10 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-bull-400 rounded-full animate-pulse" />
                          مباشر
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">{room.description}</p>
                    )}
                    {room.topic && (
                      <p className="text-primary-400 text-xs mt-1">موضوع: {room.topic}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>👥 {room.participantCount} مشارك</span>
                      <span>💬 {room._count.messages} رسالة</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
