import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface InvoiceData {
  orderNumber: string
  createdAt: Date
  status: string
  paymentMethod: string
  customer: {
    name: string
    phone: string
    city: string
    address: string
    email?: string | null
  }
  items: Array<{
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
    taxRate: number
    subtotal: number
  }>
  subtotal: number
  taxAmount: number
  deliveryFee: number
  totalAmount: number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50

// pdf-lib's StandardFonts only support the WinAnsi (Latin-1) character set and
// will throw when asked to draw glyphs outside it (e.g. Arabic). Until a Unicode
// font is embedded, sanitize any user-supplied text so invoice generation never
// crashes: keep Latin-1 code points, drop everything else.
function pdfSafe(s: string, fallback = '-'): string {
  const cleaned = Array.from(s)
    .filter((ch) => ch.codePointAt(0)! <= 0xff)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length ? cleaned : fallback
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let y = PAGE_HEIGHT - MARGIN

  // Header — brand mark + invoice title.
  page.drawText('ZAWED BEAUTY', {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color: rgb(0.85, 0.2, 0.5),
  })
  page.drawText('INVOICE', {
    x: PAGE_WIDTH - MARGIN - 110,
    y,
    size: 20,
    font: bold,
    color: rgb(0.12, 0.16, 0.24),
  })

  y -= 20
  page.drawText('Beauty & Cosmetics Store - Sudan', {
    x: MARGIN,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.45, 0.55),
  })

  y -= 30
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.9, 0.85, 0.88),
  })

  // Invoice meta.
  y -= 25
  page.drawText('Order Number', { x: MARGIN, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })
  page.drawText('Date', { x: MARGIN + 200, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })
  page.drawText('Payment', { x: PAGE_WIDTH - MARGIN - 130, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })

  y -= 14
  page.drawText(pdfSafe(data.orderNumber), { x: MARGIN, y, size: 11, font: bold, color: rgb(0.12, 0.16, 0.24) })
  page.drawText(formatDate(data.createdAt), { x: MARGIN + 200, y, size: 11, font: bold, color: rgb(0.12, 0.16, 0.24) })
  page.drawText(formatPayment(data.paymentMethod), {
    x: PAGE_WIDTH - MARGIN - 130,
    y,
    size: 11,
    font: bold,
    color: rgb(0.12, 0.16, 0.24),
  })

  // Ship-To block.
  y -= 35
  page.drawText('DELIVER TO', { x: MARGIN, y, size: 9, font: bold, color: rgb(0.4, 0.45, 0.55) })
  y -= 14
  page.drawText(pdfSafe(data.customer.name), { x: MARGIN, y, size: 12, font: bold, color: rgb(0.12, 0.16, 0.24) })
  y -= 14
  page.drawText(`Phone: ${pdfSafe(data.customer.phone)}`, { x: MARGIN, y, size: 10, font })
  y -= 13
  page.drawText(`City: ${pdfSafe(data.customer.city)}`, { x: MARGIN, y, size: 10, font })
  y -= 13
  page.drawText(`Address: ${pdfSafe(data.customer.address)}`, { x: MARGIN, y, size: 10, font })
  if (data.customer.email) {
    y -= 13
    page.drawText(pdfSafe(data.customer.email), { x: MARGIN, y, size: 10, font })
  }

  // Items table.
  y -= 35
  const tableTop = y
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - 18,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 20,
    color: rgb(0.98, 0.94, 0.96),
  })
  page.drawText('ITEM (SKU)', { x: MARGIN + 8, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('QTY', { x: MARGIN + 300, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('UNIT', { x: MARGIN + 360, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('SUBTOTAL', {
    x: PAGE_WIDTH - MARGIN - 75,
    y: tableTop - 12,
    size: 9,
    font: bold,
    color: rgb(0.3, 0.35, 0.45),
  })

  y = tableTop - 30
  for (const item of data.items) {
    // Product names are usually Arabic; fall back to SKU when sanitized to empty.
    const label = pdfSafe(item.productName, item.productSku)
    page.drawText(truncate(label, 34), { x: MARGIN + 8, y, size: 10, font })
    page.drawText(pdfSafe(item.productSku), { x: MARGIN + 8, y: y - 11, size: 8, font, color: rgb(0.5, 0.55, 0.6) })
    page.drawText(String(item.quantity), { x: MARGIN + 300, y, size: 10, font })
    page.drawText(money(item.unitPrice), { x: MARGIN + 360, y, size: 10, font })
    page.drawText(money(item.subtotal), { x: PAGE_WIDTH - MARGIN - 75, y, size: 10, font })
    y -= 26
    if (y < 200) break
  }

  // Totals.
  y -= 10
  page.drawLine({
    start: { x: PAGE_WIDTH / 2, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.85, 0.87, 0.9),
  })
  y -= 18
  drawTotalRow(page, font, font, 'Subtotal', money(data.subtotal), y)
  if (data.taxAmount > 0) {
    y -= 16
    drawTotalRow(page, font, font, 'Tax', money(data.taxAmount), y)
  }
  y -= 16
  drawTotalRow(page, font, font, 'Delivery', money(data.deliveryFee), y)
  y -= 22
  drawTotalRow(page, bold, bold, 'Total', money(data.totalAmount), y, true)

  // Footer note.
  page.drawText(
    'Payment: Cash on Delivery. Please have the amount ready when your order arrives.',
    { x: MARGIN, y: 60, size: 9, font, color: rgb(0.4, 0.45, 0.55) },
  )
  page.drawText('Thank you for shopping with Zawed Beauty.', {
    x: MARGIN,
    y: 45,
    size: 9,
    font,
    color: rgb(0.4, 0.45, 0.55),
  })

  return await pdf.save()
}

function drawTotalRow(
  page: ReturnType<PDFDocument['addPage']>,
  labelFont: import('pdf-lib').PDFFont,
  valueFont: import('pdf-lib').PDFFont,
  label: string,
  value: string,
  y: number,
  emphasized = false,
) {
  const size = emphasized ? 12 : 10
  const color = emphasized ? rgb(0.12, 0.16, 0.24) : rgb(0.3, 0.35, 0.45)
  page.drawText(label, { x: PAGE_WIDTH / 2 + 20, y, size, font: labelFont, color })
  page.drawText(value, { x: PAGE_WIDTH - MARGIN - 75, y, size, font: valueFont, color })
}

function money(v: number) {
  return `${Math.round(v).toLocaleString('en-US')} SDG`
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}

function formatPayment(p: string) {
  return p === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : p.replace(/_/g, ' ')
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '..' : s
}
