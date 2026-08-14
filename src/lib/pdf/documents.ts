import { ar } from './arabic'
import { amountInWordsSDG } from './numberToArabicWords'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DocKind = 'quotation' | 'proforma' | 'invoice' | 'delivery_note'

export interface DocParty {
  name: string
  address?: string | null
  taxId?: string | null
  phone?: string | null
  email?: string | null
}

export interface DocLine {
  name: string
  sku: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface DocData {
  kind: DocKind
  number: string
  date: string | Date
  validUntil?: string | Date | null
  poNumber?: string | null
  customer: DocParty
  lines: DocLine[]
  subtotal: number
  vatPercent?: number
  vatAmount?: number
  total: number
  fxRate?: number | null
  notes?: string | null
  terms?: string | null
}

/* ------------------------------------------------------------------ */
/* Supplier letterhead (configurable per deployment)                   */
/* ------------------------------------------------------------------ */

const SUPPLIER: DocParty = {
  name: import.meta.env.VITE_SUPPLIER_NAME || 'شركة النيل للتوريدات المكتبية المحدودة',
  address: import.meta.env.VITE_SUPPLIER_ADDRESS || 'الخرطوم — السودان',
  taxId: import.meta.env.VITE_SUPPLIER_TAX_ID || null,
  phone: import.meta.env.VITE_SUPPLIER_PHONE || null,
  email: import.meta.env.VITE_SUPPLIER_EMAIL || null,
}

const TITLES: Record<DocKind, { ar: string; en: string }> = {
  quotation: { ar: 'عرض سعر', en: 'QUOTATION' },
  proforma: { ar: 'فاتورة مبدئية (بروفورما)', en: 'PROFORMA INVOICE' },
  invoice: { ar: 'فاتورة ضريبية', en: 'TAX INVOICE' },
  delivery_note: { ar: 'إذن تسليم', en: 'DELIVERY NOTE' },
}

// Kept in step with the app's validated ramp (tailwind.config.ts): the earlier
// #0d5c63 fell under the chroma floor and #d4a24e measured 2.31:1 on white.
// A document is the thing a customer keeps, so it should not be printed in a
// palette the interface has already retired.
const TEAL = '#0a6d74'
const GOLD = '#b8801f'
const INK = '#0f2b34'
const MUTED = '#5b6b70'
const LINE = '#e3eaec'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// U+200F (RLM) fixes the direction of the run so the '.' inside "ج.س" keeps
// its place; without it the neutral character drifts and the dot disappears.
const RLM = '\u200F'
const money = (v: number) => `${Math.round(Number(v) || 0).toLocaleString('en-US')} ${RLM}ج.س${RLM}`
const num = (v: number) => Number(v || 0).toLocaleString('en-US')

function isoDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d)
}

/**
 * Bilingual label. Arabic and English go on separate lines rather than into
 * one "العربية / English" string: a mixed-direction run puts the separator in
 * an unpredictable place, while two stacked runs are each unambiguous.
 */
const bi = (arabic: string, english: string) => ({
  stack: [
    { text: ar(arabic) },
    { text: english, style: 'labelEn' as const },
  ],
})

let fontsReady: Promise<Record<string, string>> | null = null

async function ttfToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`font ${url} failed: ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * Amiri is used for documents rather than the UI's Cairo: it carries complete
 * Arabic coverage and reads as a traditional invoice face. The TTFs live in
 * /public and are fetched only when a document is generated, so they never
 * enter the main JS bundle.
 */
function loadFonts(): Promise<Record<string, string>> {
  if (!fontsReady) {
    fontsReady = Promise.all([
      ttfToBase64('/fonts/Amiri-Regular.ttf'),
      ttfToBase64('/fonts/Amiri-Bold.ttf'),
    ]).then(([regular, bold]) => ({
      'Amiri-Regular.ttf': regular,
      'Amiri-Bold.ttf': bold,
    }))
  }
  return fontsReady
}

/* ------------------------------------------------------------------ */
/* Document definition                                                 */
/* ------------------------------------------------------------------ */

function buildDocDefinition(data: DocData) {
  const title = TITLES[data.kind]
  const showPrices = data.kind !== 'delivery_note'
  const isQuote = data.kind === 'quotation'

  // pdfmake lays columns out left→right. For an RTL reading order the first
  // column the eye meets (#) must therefore be LAST in the array.
  const tableHeader = showPrices
    ? [
        { ...bi('الإجمالي', 'Amount'), style: 'th', alignment: 'left' },
        { ...bi('سعر الوحدة', 'Unit Price'), style: 'th', alignment: 'left' },
        { ...bi('الكمية', 'Qty'), style: 'th', alignment: 'center' },
        { ...bi('الصنف', 'Description'), style: 'th', alignment: 'right' },
        { text: '#', style: 'th', alignment: 'center' },
      ]
    : [
        { ...bi('الكمية', 'Qty'), style: 'th', alignment: 'center' },
        { ...bi('الصنف', 'Description'), style: 'th', alignment: 'right' },
        { text: '#', style: 'th', alignment: 'center' },
      ]

  const body = [
    tableHeader,
    ...data.lines.map((line, i) => {
      const description = {
        stack: [
          { text: ar(line.name), alignment: 'right' as const },
          { text: line.sku, style: 'sku', alignment: 'right' as const },
        ],
      }
      return showPrices
        ? [
            { text: money(line.lineTotal), alignment: 'left' as const, style: 'td' },
            { text: money(line.unitPrice), alignment: 'left' as const, style: 'td' },
            { text: num(line.qty), alignment: 'center' as const, style: 'td' },
            description,
            { text: String(i + 1), alignment: 'center' as const, style: 'td' },
          ]
        : [
            { text: num(line.qty), alignment: 'center' as const, style: 'td' },
            description,
            { text: String(i + 1), alignment: 'center' as const, style: 'td' },
          ]
    }),
  ]

  const metaBoxes = [
    metaBox(bi('التاريخ', 'Date'), isoDate(data.date)),
    metaBox(bi('رقم المستند', 'No.'), data.number),
  ]
  if (isQuote && data.validUntil) {
    metaBoxes.unshift(metaBox(bi('صالح حتى', 'Valid until'), isoDate(data.validUntil)))
  }
  if (data.poNumber) {
    metaBoxes.unshift(metaBox(bi('أمر الشراء', 'PO No.'), data.poNumber))
  }

  const content: Record<string, unknown>[] = [
    // Header: title on the left, supplier letterhead on the right.
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: ar(title.ar), style: 'docTitle' },
            { text: title.en, style: 'docTitleEn' },
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: ar(SUPPLIER.name), style: 'brand', alignment: 'right' },
            { text: ar(SUPPLIER.address ?? ''), style: 'brandSub', alignment: 'right' },
            ...(SUPPLIER.phone
              ? [{ text: `${SUPPLIER.phone}`, style: 'brandSub', alignment: 'right' as const }]
              : []),
            ...(SUPPLIER.taxId
              ? [
                  {
                    text: ar(`الرقم الضريبي: ${SUPPLIER.taxId}`),
                    style: 'brandSub',
                    alignment: 'right' as const,
                  },
                ]
              : []),
          ],
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 2, lineColor: TEAL }] },

    { columns: metaBoxes, columnGap: 8, margin: [0, 14, 0, 0] },

    // Bill-to
    {
      margin: [0, 16, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  ...bi(
                    data.kind === 'delivery_note' ? 'تسليم إلى' : 'فاتورة إلى',
                    data.kind === 'delivery_note' ? 'Deliver To' : 'Bill To',
                  ),
                  style: 'sectionLabel',
                  alignment: 'right',
                },
                { text: ar(data.customer.name), style: 'partyName', alignment: 'right' },
                ...(data.customer.address
                  ? [{ text: ar(data.customer.address), style: 'partyLine', alignment: 'right' as const }]
                  : []),
                ...(data.customer.taxId
                  ? [
                      {
                        text: ar(`الرقم الضريبي: ${data.customer.taxId}`),
                        style: 'partyLine',
                        alignment: 'right' as const,
                      },
                    ]
                  : []),
                ...(data.customer.phone
                  ? [{ text: `${data.customer.phone}`, style: 'partyLine', alignment: 'right' as const }]
                  : []),
              ],
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: {
        hLineColor: () => LINE,
        vLineColor: () => LINE,
        hLineWidth: () => 1,
        vLineWidth: () => 1,
      },
    },

    // Items
    {
      margin: [0, 16, 0, 0],
      table: {
        headerRows: 1,
        widths: showPrices ? [70, 70, 40, '*', 22] : [60, '*', 22],
        body,
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? TEAL : rowIndex % 2 === 0 ? '#f7fafa' : null,
        hLineColor: () => LINE,
        vLineColor: () => LINE,
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    },
  ]

  if (showPrices) {
    content.push({
      margin: [0, 14, 0, 0],
      columns: [
        // Totals sit on the left; the words block fills the right.
        {
          width: 230,
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: money(data.subtotal), alignment: 'left', style: 'td' },
                { ...bi('المجموع الفرعي', 'Subtotal'), alignment: 'right', style: 'totalLabel' },
              ],
              [
                { text: money(data.vatAmount ?? 0), alignment: 'left', style: 'td' },
                {
                  ...bi(`الضريبة ${data.vatPercent ?? 0}%`, 'VAT'),
                  alignment: 'right',
                  style: 'totalLabel',
                },
              ],
              [
                { text: money(data.total), alignment: 'left', style: 'grandValue' },
                { ...bi('الإجمالي', 'Total'), alignment: 'right', style: 'grandLabel' },
              ],
            ],
          },
          layout: {
            hLineColor: () => LINE,
            vLineWidth: () => 0,
            hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
              i === 0 || i === node.table.body.length ? 0 : 1,
            fillColor: (rowIndex: number) => (rowIndex === 2 ? TEAL : null),
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },
        {
          width: '*',
          stack: [
            { ...bi('الإجمالي كتابةً', 'Amount in words'), style: 'sectionLabel', alignment: 'right' },
            { text: ar(amountInWordsSDG(data.total)), style: 'words', alignment: 'right' },
            ...(data.fxRate
              ? [
                  {
                    text: ar(`سعر الصرف المعتمد: ${num(data.fxRate)} ج.س لكل 1 دولار`),
                    style: 'partyLine',
                    alignment: 'right' as const,
                    margin: [0, 4, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
          ],
          margin: [0, 0, 12, 0],
        },
      ],
    })
  }

  if (isQuote) {
    content.push({
      margin: [0, 16, 0, 0],
      text: ar('هذا العرض صالح لمدة 7 أيام من تاريخه وقابل للمراجعة عند تغيّر سعر الصرف'),
      style: 'validityNote',
      alignment: 'right',
    })
  }

  if (data.terms) {
    content.push({
      margin: [0, 12, 0, 0],
      stack: [
        { ...bi('الشروط والأحكام', 'Terms'), style: 'sectionLabel', alignment: 'right' },
        { text: ar(data.terms), style: 'partyLine', alignment: 'right' },
      ],
    })
  }
  if (data.notes) {
    content.push({
      margin: [0, 10, 0, 0],
      stack: [
        { ...bi('ملاحظات', 'Notes'), style: 'sectionLabel', alignment: 'right' },
        { text: ar(data.notes), style: 'partyLine', alignment: 'right' },
      ],
    })
  }

  // Delivery notes need a signature block for the receiver.
  if (data.kind === 'delivery_note') {
    content.push({
      margin: [0, 44, 0, 0],
      columns: [
        signatureBlock(bi('توقيع المورّد', 'Supplier Signature')),
        signatureBlock(bi('اسم وتوقيع المستلِم', 'Received By (name & signature)')),
      ],
      columnGap: 30,
    })
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    defaultStyle: { font: 'Amiri', fontSize: 10, color: INK },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 10, 40, 0] as [number, number, number, number],
      columns: [
        { text: `${currentPage} / ${pageCount}`, alignment: 'left', fontSize: 7, color: MUTED },
        {
          text: ar(`${SUPPLIER.name} — ${SUPPLIER.address ?? ''}`),
          alignment: 'right',
          fontSize: 7,
          color: MUTED,
        },
      ],
    }),
    styles: {
      docTitle: { fontSize: 20, bold: true, color: TEAL },
      docTitleEn: { fontSize: 8, color: MUTED, characterSpacing: 1 },
      brand: { fontSize: 12, bold: true, color: INK },
      brandSub: { fontSize: 7.5, color: MUTED },
      sectionLabel: { fontSize: 7.5, bold: true, color: TEAL, margin: [0, 0, 0, 3] },
      partyName: { fontSize: 12, bold: true },
      partyLine: { fontSize: 8, color: MUTED },
      th: { fontSize: 8, bold: true, color: '#ffffff', margin: [2, 2, 2, 2] },
      td: { fontSize: 8.5 },
      sku: { fontSize: 6.5, color: MUTED },
      totalLabel: { fontSize: 8, color: MUTED },
      grandLabel: { fontSize: 10, bold: true, color: '#ffffff' },
      grandValue: { fontSize: 11, bold: true, color: '#ffffff' },
      words: { fontSize: 9, bold: true },
      validityNote: { fontSize: 8, color: GOLD, bold: true },
      labelEn: { fontSize: 6.5, color: MUTED },
      metaKey: { fontSize: 6.5, color: MUTED },
      metaValue: { fontSize: 10, bold: true },
    },
  }
}

function metaBox(label: ReturnType<typeof bi>, value: string) {
  return {
    width: 'auto',
    table: {
      widths: ['auto'],
      body: [
        [
          {
            stack: [
              { ...label, style: 'metaKey', alignment: 'center' },
              { text: value, style: 'metaValue', alignment: 'center' },
            ],
            margin: [10, 4, 10, 4],
          },
        ],
      ],
    },
    layout: {
      fillColor: () => '#eef5f6',
      hLineWidth: () => 0,
      vLineWidth: () => 0,
    },
  }
}

function signatureBlock(label: ReturnType<typeof bi>) {
  return {
    width: '*',
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 30, x2: 220, y2: 30, lineWidth: 1, lineColor: INK }] },
      { ...label, alignment: 'center', fontSize: 8, color: MUTED, margin: [0, 6, 0, 0] },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

let registered = false

async function createPdf(data: DocData) {
  // pdfmake (~1MB) is pulled in only when a document is actually generated.
  const [{ default: pdfMake }, vfs] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    loadFonts(),
  ])

  // Register once per session: the virtual file system holding the TTF bytes,
  // and a font map that REPLACES pdfmake's Latin-only Roboto default.
  if (!registered) {
    pdfMake.addVirtualFileSystem(vfs)
    pdfMake.setFonts({
      Amiri: {
        normal: 'Amiri-Regular.ttf',
        bold: 'Amiri-Bold.ttf',
        italics: 'Amiri-Regular.ttf',
        bolditalics: 'Amiri-Bold.ttf',
      },
    })
    registered = true
  }

  return pdfMake.createPdf(buildDocDefinition(data))
}

export function documentFileName(data: DocData): string {
  const prefix: Record<DocKind, string> = {
    quotation: 'quotation',
    proforma: 'proforma',
    invoice: 'invoice',
    delivery_note: 'delivery-note',
  }
  return `${prefix[data.kind]}-${data.number}.pdf`
}

export async function downloadDocument(data: DocData): Promise<void> {
  const pdf = await createPdf(data)
  await pdf.download(documentFileName(data))
}

export async function openDocument(data: DocData): Promise<void> {
  const pdf = await createPdf(data)
  await pdf.open()
}

/** Used by the automated rendering check. */
export async function documentAsDataUrl(data: DocData): Promise<string> {
  const pdf = await createPdf(data)
  return pdf.getDataUrl()
}
