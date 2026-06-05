interface ReputationBadgeProps {
  score: number
  size?: 'sm' | 'md'
  showLabel?: boolean
}

function getRepColor(score: number) {
  if (score >= 80) return { text: 'text-primary-400', bg: 'bg-primary-500/15', border: 'border-primary-500/40', label: 'خبير' }
  if (score >= 60) return { text: 'text-bull-400', bg: 'bg-bull-500/15', border: 'border-bull-500/40', label: 'موثوق' }
  if (score >= 40) return { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40', label: 'نشط' }
  return { text: 'text-slate-400', bg: 'bg-slate-700/40', border: 'border-slate-600/40', label: 'مبتدئ' }
}

export function ReputationBadge({ score, size = 'sm', showLabel = false }: ReputationBadgeProps) {
  const { text, bg, border, label } = getRepColor(score)
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} font-semibold px-1.5 py-0.5 rounded-md border ${text} ${bg} ${border}`}
      title={`Reputation Score: ${score.toFixed(0)}`}
    >
      <span>★</span>
      <span>{score.toFixed(0)}</span>
      {showLabel && <span className="opacity-70">· {label}</span>}
    </span>
  )
}
