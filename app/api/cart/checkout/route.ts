import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeCart } from '@/lib/cart'
import { generateOrderNumber } from '@/lib/utils'

// Flat delivery fee (SDG). Free over the threshold.
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE ?? 1000)
const FREE_DELIVERY_OVER = Number(process.env.FREE_DELIVERY_OVER ?? 20000)

const schema = z.object({
  customerName: z.string().min(2, 'الاسم مطلوب'),
  customerPhone: z.string().min(7, 'رقم الهاتف مطلوب'),
  shippingCity: z.string().min(2, 'المدينة مطلوبة'),
  shippingAddress: z.string().min(3, 'العنوان مطلوب'),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'بيانات غير صحيحة' },
      { status: 400 },
    )
  }

  const cart = await prisma.cart.findFirst({
    where: { userId: session.sub, status: 'ACTIVE' },
    include: { items: { include: { product: true } } },
  })
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })
  }

  // Validate stock for each item.
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      return NextResponse.json(
        {
          error: `الكمية المطلوبة من "${item.product.name}" غير متوفرة — المتبقي ${item.product.stock} فقط.`,
        },
        { status: 400 },
      )
    }
  }

  const { lines, totals } = await computeCart(cart.id)
  const deliveryFee = totals.subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        placedById: session.sub,
        status: 'PENDING_PAYMENT',
        paymentMethod: 'CASH_ON_DELIVERY',
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        shippingCity: parsed.data.shippingCity,
        shippingAddress: parsed.data.shippingAddress,
        notes: parsed.data.notes || null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        deliveryFee,
        totalAmount: totals.totalAmount + deliveryFee,
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

    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      })
    }

    await tx.cart.update({ where: { id: cart.id }, data: { status: 'CHECKED_OUT' } })

    // Save the delivery details on the user profile to prefill next time.
    await tx.user.update({
      where: { id: session.sub },
      data: {
        phone: parsed.data.customerPhone,
        city: parsed.data.shippingCity,
        address: parsed.data.shippingAddress,
      },
    })

    return created
  })

  return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber })
}
