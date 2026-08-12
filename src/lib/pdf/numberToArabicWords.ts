/**
 * Amount in words, in Arabic — required on quotations and tax invoices.
 * Handles 0 … 999,999,999,999.
 *
 * Grammar notes: 1 and 2 use the singular/dual scale word alone
 * (ألف / ألفان), 3–10 take the broken plural (ثلاثة آلاف), and 11+ keep the
 * singular (أحد عشر ألف) — the form conventionally used on invoices.
 */

const ONES = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
]

const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']

const HUNDREDS = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
]

/** [singular, dual, plural] for each 1000^n scale. */
const SCALES: [string, string, string][] = [
  ['', '', ''],
  ['ألف', 'ألفان', 'آلاف'],
  ['مليون', 'مليونان', 'ملايين'],
  ['مليار', 'ملياران', 'مليارات'],
]

/** Words for a 1–999 group. */
function groupToWords(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100

  if (hundreds > 0) parts.push(HUNDREDS[hundreds])

  if (rest > 0) {
    if (rest < 20) {
      parts.push(ONES[rest])
    } else {
      const tens = Math.floor(rest / 10)
      const ones = rest % 10
      // Arabic reads the unit before the ten: واحد وعشرون
      parts.push(ones > 0 ? `${ONES[ones]} و${TENS[tens]}` : TENS[tens])
    }
  }

  return parts.join(' و')
}

function scaleWord(groupValue: number, scaleIndex: number): string {
  if (scaleIndex === 0) return ''
  const [singular, dual, plural] = SCALES[scaleIndex]
  if (groupValue === 1) return singular
  if (groupValue === 2) return dual
  if (groupValue >= 3 && groupValue <= 10) return plural
  return singular
}

export function numberToArabicWords(value: number): string {
  const n = Math.floor(Math.abs(Number(value) || 0))
  if (n === 0) return 'صفر'

  // Split into groups of three, least-significant first.
  const groups: number[] = []
  let remaining = n
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) continue

    if (i === 0) {
      parts.push(groupToWords(g))
    } else if (g === 1 || g === 2) {
      // ألف / ألفان stand alone — no counting word before them.
      parts.push(scaleWord(g, i))
    } else {
      parts.push(`${groupToWords(g)} ${scaleWord(g, i)}`)
    }
  }

  return parts.join(' و')
}

/** Full money phrase, e.g. "فقط ثلاثة ملايين وثلاثمائة ألف جنيه سوداني لا غير". */
export function amountInWordsSDG(value: number): string {
  return `فقط ${numberToArabicWords(value)} جنيه سوداني لا غير`
}
