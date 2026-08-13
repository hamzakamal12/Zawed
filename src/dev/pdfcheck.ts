/**
 * Dev-only harness: generates each PDF document through the real production
 * code path and rasterises it with pdf.js so the Arabic output can be
 * inspected. Served at /pdfcheck.html by the Vite dev server.
 */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { documentAsDataUrl, type DocData, type DocKind } from '@/lib/pdf/documents'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const status = document.getElementById('status')!
const out = document.getElementById('out')!

const base: Omit<DocData, 'kind' | 'number'> = {
  date: new Date('2026-08-13'),
  validUntil: new Date('2026-08-20'),
  poNumber: 'PO-RELIEF-2026-019',
  customer: {
    name: 'منظمة الإغاثة الدولية',
    address: 'الخرطوم - المعمورة، مربع 12',
    taxId: 'NGO-SD-4471',
    phone: '+249 912 345 678',
  },
  lines: [
    { name: 'ورق تصوير A4 وزن 80 جرام (رزمة 500)', sku: 'PAP-A4-80', qty: 30, unitPrice: 10500, lineTotal: 315000 },
    { name: 'أقلام جافة زرقاء (علبة 50)', sku: 'PEN-BL-50', qty: 12, unitPrice: 13400, lineTotal: 160800 },
    { name: 'حبر طابعة HP 85A', sku: 'TONER-HP85', qty: 2, unitPrice: 140400, lineTotal: 280800 },
  ],
  subtotal: 756600,
  vatPercent: 0,
  vatAmount: 0,
  total: 756600,
  fxRate: 2600,
  notes: 'التسليم صباحاً قبل الساعة 11.',
  terms: 'الدفع خلال 30 يوماً من تاريخ الفاتورة. الأسعار قابلة للمراجعة عند تغيّر سعر الصرف.',
}

const kinds: [DocKind, string][] = [
  ['quotation', 'Q-2026-0001'],
  ['invoice', 'INV-2026-0001'],
  ['delivery_note', 'DN-2026-0001'],
]

async function render(kind: DocKind, number: string) {
  const dataUrl = await documentAsDataUrl({ ...base, kind, number })
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0))
  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const page = await pdf.getPage(1)

  const tc = await page.getTextContent()
  const text = tc.items.map((i) => ('str' in i ? i.str : '')).filter((s) => s.trim())
  const store = window as unknown as { __pdfText: Record<string, string[]> }
  store.__pdfText = { ...(store.__pdfText ?? {}), [kind]: text }

  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.id = `canvas-${kind}`
  out.appendChild(canvas)
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
}

;(async () => {
  try {
    for (const [kind, number] of kinds) {
      status.textContent = `rendering ${kind}…`
      await render(kind, number)
    }
    status.textContent = 'DONE'
    document.body.dataset.ready = 'true'
  } catch (err) {
    status.textContent = `FAILED: ${err instanceof Error ? err.message : String(err)}`
    document.body.dataset.ready = 'error'
  }
})()
