import clsx from 'clsx'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/* ---------------------------------- Button --------------------------------- */

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300',
  accent:
    'bg-accent-500 text-white shadow-sm hover:bg-accent-600 active:bg-accent-700 disabled:opacity-50',
  outline:
    'border border-line bg-white text-ink hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50',
  ghost: 'text-primary-700 hover:bg-primary-50 disabled:opacity-50',
  danger: 'bg-status-critical text-white shadow-sm hover:brightness-95 disabled:opacity-50',
  success: 'bg-status-good text-white shadow-sm hover:brightness-95 disabled:opacity-50',
}

// Min 44px tap targets on md/lg (mobile spec).
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-semibold',
        'transition-all duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

/* ----------------------------------- Card ---------------------------------- */

export function Card({
  className,
  children,
  interactive,
}: {
  className?: string
  children: ReactNode
  interactive?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-line bg-white shadow-card',
        interactive && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-4 sm:p-5', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={clsx('text-base font-bold text-ink', className)}>{children}</h2>
}

/* ---------------------------------- Inputs --------------------------------- */

const fieldBase =
  'w-full rounded-lg border border-line bg-white px-3 text-sm text-ink transition-colors ' +
  'placeholder:text-muted/55 hover:border-primary-200 ' +
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 ' +
  'disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldBase, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldBase, 'min-h-[80px] py-2.5', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(fieldBase, 'h-11', className)} {...props}>
      {children}
    </select>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {hint && <span className="ms-1 font-normal text-muted">({hint})</span>}
    </label>
  )
}

/* ---------------------------------- Badge ---------------------------------- */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const tones: Record<Tone, string> = {
  neutral: 'bg-line/70 text-muted',
  success: 'bg-status-good/12 text-[#0a7a0a]',
  warning: 'bg-status-warning/20 text-[#8a5d00]',
  danger: 'bg-status-critical/12 text-[#a52c2c]',
  info: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-700',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/* --------------------------------- Feedback -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white/60 py-16 text-center">
      {icon && (
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-400">
          {icon}
        </div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="-mt-2 text-sm text-muted">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string
  onRetry?: () => void
  retryLabel: string
}) {
  return (
    <div className="rounded-xl border border-status-critical/25 bg-status-critical/5 p-4 text-sm text-[#a52c2c]">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

/* -------------------------------- Stat tile -------------------------------- */

/**
 * Stat-tile contract from the dataviz skill: label (sentence case, no colon),
 * value (semibold, PROPORTIONAL figures — tabular-nums makes a large standalone
 * number look loose), optional delta, optional meter.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  loading,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'warning' | 'critical' | 'brand'
  loading?: boolean
}) {
  const valueTone =
    tone === 'critical'
      ? 'text-status-critical'
      : tone === 'warning'
        ? 'text-[#8a5d00]'
        : tone === 'brand'
          ? 'text-primary-700'
          : 'text-ink'

  return (
    <Card className="relative overflow-hidden">
      {/* A hairline of colour rather than a filled card — keeps the ink on data. */}
      <span
        aria-hidden
        className={clsx(
          'absolute inset-x-0 top-0 h-0.5',
          tone === 'critical'
            ? 'bg-status-critical'
            : tone === 'warning'
              ? 'bg-status-warning'
              : 'bg-primary-500',
        )}
      />
      <CardBody>
        <div className="flex items-center gap-1.5 text-muted">
          {icon}
          <span className="text-[11px] font-semibold leading-tight">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <div className={clsx('mt-1 text-2xl font-extrabold tracking-tight', valueTone)}>
            {value}
          </div>
        )}
        {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
      </CardBody>
    </Card>
  )
}

/**
 * Horizontal meter for a single-series magnitude row.
 * Per the mark specs: capped thickness, 4px rounded data-end, and an unfilled
 * track that is a lighter step of the SAME hue so state reads across the bar.
 */
export function Meter({ percent, tone = 'brand' }: { percent: number; tone?: 'brand' | 'accent' }) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-primary-100">
      <div
        className={clsx('h-full rounded-e-[4px]', tone === 'brand' ? 'bg-primary-500' : 'bg-accent-400')}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* -------------------------------- Qty stepper ------------------------------ */

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  disabled?: boolean
}) {
  const clamp = (n: number) => Math.max(min, max ? Math.min(max, n) : n)
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-white">
      <button
        type="button"
        aria-label="-"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="h-11 w-11 text-lg font-bold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
        className="nums-table h-11 w-14 border-x border-line text-center text-sm font-semibold focus:outline-none"
      />
      <button
        type="button"
        aria-label="+"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
        className="h-11 w-11 text-lg font-bold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}
