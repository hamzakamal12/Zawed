interface TickerProps {
  symbol: string
  change?: number
}

export function Ticker({ symbol, change }: TickerProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md
        ${isPositive ? 'text-bull-400 bg-bull-500/10' : isNegative ? 'text-bear-400 bg-bear-500/10' : 'text-slate-300 bg-slate-700/40'}`}
    >
      {symbol}
      {change !== undefined && (
        <span>
          {isPositive ? '+' : ''}
          {change.toFixed(2)}%
        </span>
      )}
    </span>
  )
}
