/**
 * Numbers are ALWAYS Western digits (1234) per the design spec, in both
 * languages — 'en-US' grouping is used even when the UI is Arabic.
 */

export function formatSDG(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${Math.round(Number(value)).toLocaleString('en-US')} ج.س`
}

export function formatUSD(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return Number(value).toLocaleString('en-US')
}

export function formatDate(value: string | Date | null | undefined, lang: 'ar' | 'en'): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  // ar-EG with 'latn' keeps Western digits while naming months in Arabic.
  const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(value: string | Date | null | undefined, lang: 'ar' | 'en'): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Hours since a timestamp — used to flag a stale FX rate. */
export function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return null
  return (Date.now() - then) / 36e5
}

/**
 * Arabic search normalisation: strips diacritics/tatweel and folds the
 * letter variants people type interchangeably (أ إ آ → ا, ة → ه, ى → ي).
 * Mirrors the tolerance of the DB's unaccent index for client-side filtering.
 */
export function normalizeArabic(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim()
}
