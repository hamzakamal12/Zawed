import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { generateInvoicePdf } from '@/lib/pdf'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const proforma = searchParams.get('type') === 'proforma'

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, placedBy: true, company: true },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.companyId !== session.companyId && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pdfBytes = await generateInvoicePdf(
    {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentMethod: order.paymentMethod,
      company: order.company,
      placedBy: { name: order.placedBy.name, email: order.placedBy.email },
      items: order.items.map((i) => ({
        productName: i.productName,
        productSku: i.productSku,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
        subtotal: Number(i.subtotal),
      })),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
    },
    proforma,
  )

  const prefix = proforma ? 'proforma' : 'invoice'
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${prefix}-${order.orderNumber}.pdf"`,
    },
  })
}
