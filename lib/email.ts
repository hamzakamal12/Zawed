import { Resend } from 'resend'
import { generateInvoicePdf, type InvoiceData } from './pdf'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Zawed Invoices <invoices@zawed.io>'

export async function sendProformaInvoice(to: string, data: InvoiceData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const pdfBytes = await generateInvoicePdf(data, true)
  const base64 = Buffer.from(pdfBytes).toString('base64')

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Proforma Invoice ${data.orderNumber} — Zawed`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#1d3abc;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-size:22px;font-weight:700">ZAWED</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b">Proforma Invoice — ${data.orderNumber}</h2>
          <p style="margin:0 0 16px;color:#64748b;font-size:14px">
            Your order has been received and is awaiting payment confirmation.
          </p>
          <p style="margin:0 0 4px;color:#1e293b;font-size:14px"><strong>Bill To:</strong> ${data.company.name}</p>
          <p style="margin:0 0 16px;color:#64748b;font-size:14px">
            Total: <strong>$${data.totalAmount.toFixed(2)}</strong>
          </p>
          <p style="margin:0;color:#94a3b8;font-size:12px">
            The attached PDF is a proforma invoice. A final tax invoice will be issued after payment is confirmed.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center">
            Zawed · B2B Procurement Platform
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `proforma-${data.orderNumber}.pdf`,
        content: base64,
      },
    ],
  })
}
