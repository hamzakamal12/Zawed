import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeCart } from '@/lib/cart'
import { generateOrderNumber } from '@/lib/utils'
import { sendProformaInvoice } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only Procurement Managers and Admins can check out' },
      { status: 403 },
    )
  }

  const cart = await prisma.cart.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  })
  if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cart.companyId !== session.companyId && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (cart.status !== 'APPROVED' && cart.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Cart must be approved (or active for Manager carts) before checkout' },
      { status: 400 },
    )
  }
  if (cart.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Validate stock for each item.
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      return NextResponse.json(
        {
          error: `Insufficient stock for ${item.product.name} — only ${item.product.stock} available.`,
        },
        { status: 400 },
      )
    }
  }

  const company = await prisma.company.findUnique({ where: { id: cart.companyId } })
  const ngoDiscountRate = company?.verified ? Number(company.ngoDiscount) : 0

  const { lines, totals } = await computeCart(cart.id, ngoDiscountRate)

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        companyId: cart.companyId,
        placedById: session.sub,
        status: 'PENDING_PAYMENT',
        paymentMethod: 'CASH_ON_DELIVERY',
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            productSku: l.productSku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            subtotal: l.subtotal,
          })),
        },
      },
    })

    // Decrement stock per item.
    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      })
    }

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: 'CHECKED_OUT' },
    })

    return created
  })

  // Send proforma invoice email to procurement manager if configured.
  if (company?.procurementEmail) {
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, placedBy: true },
    })
    if (orderWithItems) {
      sendProformaInvoice(company.procurementEmail, {
        orderNumber: orderWithItems.orderNumber,
        createdAt: orderWithItems.createdAt,
        status: orderWithItems.status,
        paymentMethod: orderWithItems.paymentMethod,
        company: {
          name: company.name,
          address: company.address,
          taxId: company.taxId,
          email: company.email,
          phone: company.phone,
        },
        placedBy: { name: orderWithItems.placedBy.name, email: orderWithItems.placedBy.email },
        items: orderWithItems.items.map((i) => ({
          productName: i.productName,
          productSku: i.productSku,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
          subtotal: Number(i.subtotal),
        })),
        subtotal: Number(orderWithItems.subtotal),
        taxAmount: Number(orderWithItems.taxAmount),
        totalAmount: Number(orderWithItems.totalAmount),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber })
}
