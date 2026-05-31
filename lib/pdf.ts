import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface InvoiceData {
  orderNumber: string
  createdAt: Date
  status: string
  paymentMethod: string
  company: {
    name: string
    address?: string | null
    taxId?: string | null
    email?: string | null
    phone?: string | null
  }
  placedBy: {
    name: string
    email: string
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
  totalAmount: number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let y = PAGE_HEIGHT - MARGIN

  // Header — brand mark + invoice title.
  page.drawText('ZAWED', {
    x: MARGIN,
    y,
    size: 24,
    font: bold,
    color: rgb(0.15, 0.3, 0.85),
  })
  page.drawText('TAX INVOICE', {
    x: PAGE_WIDTH - MARGIN - 130,
    y,
    size: 20,
    font: bold,
    color: rgb(0.12, 0.16, 0.24),
  })

  y -= 20
  page.drawText('B2B Procurement Platform', {
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
    color: rgb(0.85, 0.87, 0.9),
  })

  // Invoice meta — two columns.
  y -= 25
  page.drawText('Invoice Number', { x: MARGIN, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })
  page.drawText('Invoice Date', { x: MARGIN + 200, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })
  page.drawText('Payment Method', { x: PAGE_WIDTH - MARGIN - 130, y, size: 9, font, color: rgb(0.4, 0.45, 0.55) })

  y -= 14
  page.drawText(data.orderNumber, { x: MARGIN, y, size: 11, font: bold, color: rgb(0.12, 0.16, 0.24) })
  page.drawText(formatDate(data.createdAt), { x: MARGIN + 200, y, size: 11, font: bold, color: rgb(0.12, 0.16, 0.24) })
  page.drawText(formatPayment(data.paymentMethod), {
    x: PAGE_WIDTH - MARGIN - 130,
    y,
    size: 11,
    font: bold,
    color: rgb(0.12, 0.16, 0.24),
  })

  // Bill-To block.
  y -= 35
  page.drawText('BILL TO', { x: MARGIN, y, size: 9, font: bold, color: rgb(0.4, 0.45, 0.55) })
  y -= 14
  page.drawText(data.company.name, { x: MARGIN, y, size: 12, font: bold, color: rgb(0.12, 0.16, 0.24) })
  if (data.company.address) {
    y -= 14
    page.drawText(data.company.address, { x: MARGIN, y, size: 10, font })
  }
  if (data.company.taxId) {
    y -= 13
    page.drawText(`Tax ID: ${data.company.taxId}`, { x: MARGIN, y, size: 10, font })
  }
  if (data.company.email) {
    y -= 13
    page.drawText(data.company.email, { x: MARGIN, y, size: 10, font })
  }
  if (data.company.phone) {
    y -= 13
    page.drawText(data.company.phone, { x: MARGIN, y, size: 10, font })
  }
  y -= 13
  page.drawText(`Placed by: ${data.placedBy.name} (${data.placedBy.email})`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.45, 0.55),
  })

  // Items table.
  y -= 35
  const tableTop = y
  // Table header background.
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - 18,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 20,
    color: rgb(0.95, 0.96, 0.98),
  })
  page.drawText('ITEM', { x: MARGIN + 8, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('QTY', { x: MARGIN + 280, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('UNIT', { x: MARGIN + 340, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('TAX', { x: MARGIN + 400, y: tableTop - 12, size: 9, font: bold, color: rgb(0.3, 0.35, 0.45) })
  page.drawText('SUBTOTAL', {
    x: PAGE_WIDTH - MARGIN - 60,
    y: tableTop - 12,
    size: 9,
    font: bold,
    color: rgb(0.3, 0.35, 0.45),
  })

  y = tableTop - 30
  for (const item of data.items) {
    page.drawText(truncate(item.productName, 38), { x: MARGIN + 8, y, size: 10, font })
    page.drawText(item.productSku, { x: MARGIN + 8, y: y - 11, size: 8, font, color: rgb(0.5, 0.55, 0.6) })
    page.drawText(String(item.quantity), { x: MARGIN + 280, y, size: 10, font })
    page.drawText(money(item.unitPrice), { x: MARGIN + 340, y, size: 10, font })
    page.drawText(`${(item.taxRate * 100).toFixed(1)}%`, { x: MARGIN + 400, y, size: 10, font })
    page.drawText(money(item.subtotal), { x: PAGE_WIDTH - MARGIN - 60, y, size: 10, font })
    y -= 26
    if (y < 200) break
  }

  // Totals box.
  y -= 10
  page.drawLine({
    start: { x: PAGE_WIDTH / 2, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.85, 0.87, 0.9),
  })
  y -= 18
  drawTotalRow(page, font, font, 'Subtotal', money(data.subtotal), y)
  y -= 16
  drawTotalRow(page, font, font, 'Tax', money(data.taxAmount), y)
  y -= 22
  drawTotalRow(page, bold, bold, 'Total Due', money(data.totalAmount), y, true)

  // Footer note.
  page.drawText(
    'Payment Terms: Cash on Delivery. Please have exact change ready upon receipt of goods.',
    { x: MARGIN, y: 60, size: 9, font, color: rgb(0.4, 0.45, 0.55) },
  )
  page.drawText('Thank you for your business with Zawed.', {
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
  page.drawText(value, { x: PAGE_WIDTH - MARGIN - 60, y, size, font: valueFont, color })
}

function money(v: number) {
  return `$${v.toFixed(2)}`
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}

function formatPayment(p: string) {
  return p === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : p.replace(/_/g, ' ')
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
