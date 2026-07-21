import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a value in Sudanese Pounds (ج.س). Prices are shown as whole pounds
 * with thousands separators — cosmetics retail prices don't need fractions.
 */
export function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  const rounded = Math.round(Number.isFinite(num) ? num : 0)
  return `${rounded.toLocaleString('en-US')} ج.س`
}

export function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function generateOrderNumber() {
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `ZW-${yymmdd}-${rand}`
}
