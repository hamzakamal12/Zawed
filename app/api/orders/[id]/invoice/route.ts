import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { generateInvoicePdf } from '@/lib/pdf'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, placedBy: true },
  })
  if (!order) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (order.placedById !== session.sub && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const pdfBytes = await generateInvoicePdf({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      city: order.shippingCity,
      address: order.shippingAddress,
      email: order.placedBy.email,
    },
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
    deliveryFee: Number(order.deliveryFee),
    totalAmount: Number(order.totalAmount),
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.pdf"`,
    },
  })
}
