import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Zawed Beauty database…')

  const passwordHash = await bcrypt.hash('password123', 10)

  // Store admin
  await prisma.user.upsert({
    where: { email: 'admin@zawed.com' },
    update: {},
    create: {
      email: 'admin@zawed.com',
      name: 'مدير المتجر',
      passwordHash,
      role: 'ADMIN',
    },
  })

  // Demo customer
  await prisma.user.upsert({
    where: { email: 'sara@example.com' },
    update: {},
    create: {
      email: 'sara@example.com',
      name: 'سارة أحمد',
      phone: '0912345678',
      city: 'الخرطوم',
      address: 'حي الرياض، شارع 15',
      passwordHash,
      role: 'CUSTOMER',
    },
  })

  // Categories
  const categories = [
    { slug: 'skincare', name: 'العناية بالبشرة', emoji: '🧴', description: 'كريمات، سيروم، غسول، وواقي شمس' },
    { slug: 'makeup', name: 'المكياج', emoji: '💄', description: 'أحمر شفاه، فاونديشن، ماسكارا، وآيشادو' },
    { slug: 'haircare', name: 'العناية بالشعر', emoji: '💇‍♀️', description: 'شامبو، بلسم، زيوت، وماسكات' },
    { slug: 'fragrance', name: 'العطور', emoji: '🌸', description: 'عطور نسائية ورجالية وبخاخات معطّرة' },
    { slug: 'bodycare', name: 'العناية بالجسم', emoji: '🧼', description: 'لوشن، مقشّر، صابون، ومزيل عرق' },
  ]

  const catMap: Record<string, string> = {}
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, emoji: c.emoji, description: c.description },
      create: c,
    })
    catMap[c.slug] = cat.id
  }

  // Products (prices in SDG)
  const products: Array<{
    sku: string
    name: string
    brand?: string
    description: string
    category: string
    price: number
    stock: number
    lowStockThreshold?: number
    featured?: boolean
  }> = [
    { sku: 'SKN-SRM-VITC', name: 'سيروم فيتامين C للتفتيح', brand: 'The Ordinary', description: 'سيروم مركّز لتوحيد لون البشرة وإشراقها، 30 مل.', category: 'skincare', price: 12000, stock: 40, featured: true },
    { sku: 'SKN-WSH-GEL', name: 'غسول منظّف للوجه', brand: 'CeraVe', description: 'غسول لطيف للبشرة الدهنية والمختلطة، 236 مل.', category: 'skincare', price: 9500, stock: 55 },
    { sku: 'SKN-SPF-50', name: 'واقي شمس SPF 50', brand: 'La Roche-Posay', description: 'حماية عالية خفيفة على البشرة بدون أثر دهني، 50 مل.', category: 'skincare', price: 15000, stock: 30, featured: true },
    { sku: 'SKN-MST-NGT', name: 'كريم ترطيب ليلي', brand: 'Nivea', description: 'كريم مغذٍّ للبشرة أثناء الليل، 50 مل.', category: 'skincare', price: 7000, stock: 60 },

    { sku: 'MKP-LIP-RED', name: 'أحمر شفاه مات', brand: 'Maybelline', description: 'ثبات طويل ولون غني، درجة أحمر كلاسيكي.', category: 'makeup', price: 6500, stock: 80, featured: true },
    { sku: 'MKP-FND-MED', name: 'كريم أساس (فاونديشن)', brand: 'L\'Oréal', description: 'تغطية متوسطة إلى كاملة بمظهر طبيعي، درجة متوسطة.', category: 'makeup', price: 11000, stock: 45 },
    { sku: 'MKP-MSC-BLK', name: 'ماسكارا مكثّفة', brand: 'Maybelline', description: 'ترفع وتكثّف الرموش، أسود مقاوم للماء.', category: 'makeup', price: 7500, stock: 70 },
    { sku: 'MKP-PLT-EYE', name: 'باليت ظلال عيون', brand: 'Huda Beauty', description: '18 درجة ترابية ولامعة عالية التصبّغ.', category: 'makeup', price: 22000, stock: 18, featured: true },

    { sku: 'HAIR-SHM-ARG', name: 'شامبو بزيت الأرغان', brand: 'OGX', description: 'ينعّم ويرطّب الشعر الجاف، 385 مل.', category: 'haircare', price: 8500, stock: 50 },
    { sku: 'HAIR-OIL-SER', name: 'سيروم زيت للشعر', brand: 'Garnier', description: 'يعالج التقصّف ويمنح لمعاناً، 100 مل.', category: 'haircare', price: 6000, stock: 65 },
    { sku: 'HAIR-MSK-KRT', name: 'ماسك الكيراتين', brand: 'Tresemmé', description: 'حمّام كريم مغذٍّ للشعر التالف، 300 مل.', category: 'haircare', price: 9000, stock: 25 },

    { sku: 'FRG-WMN-BLM', name: 'عطر نسائي — Bloom', brand: 'Zawed', description: 'رائحة زهرية ناعمة تدوم طويلاً، 50 مل.', category: 'fragrance', price: 18000, stock: 22, featured: true },
    { sku: 'FRG-MEN-OUD', name: 'عطر رجالي — Oud', brand: 'Zawed', description: 'عطر شرقي فاخر بخلاصة العود، 100 مل.', category: 'fragrance', price: 25000, stock: 15 },
    { sku: 'FRG-MST-ROSE', name: 'بخاخ معطّر بالورد', brand: 'Victoria\'s Secret', description: 'بخاخ للجسم منعش برائحة الورد، 250 مل.', category: 'fragrance', price: 9000, stock: 40 },

    { sku: 'BODY-LTN-SHEA', name: 'لوشن الجسم بزبدة الشيا', brand: 'The Body Shop', description: 'ترطيب عميق يدوم 24 ساعة، 250 مل.', category: 'bodycare', price: 8000, stock: 48 },
    { sku: 'BODY-SCR-COF', name: 'مقشّر الجسم بالقهوة', brand: 'Zawed', description: 'يزيل الجلد الميت وينعّم البشرة، 200 غم.', category: 'bodycare', price: 7000, stock: 35 },
    { sku: 'BODY-DEO-ROLL', name: 'مزيل عرق رول', brand: 'Dove', description: 'حماية تدوم وعناية بالبشرة، 50 مل.', category: 'bodycare', price: 3500, stock: 90 },
  ]

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } })
    if (existing) continue
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        brand: p.brand ?? null,
        description: p.description,
        categoryId: catMap[p.category],
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold ?? 5,
        featured: p.featured ?? false,
        priceTiers: { create: [{ minQty: 1, maxQty: null, unitPrice: p.price }] },
      },
    })
  }

  console.log('Seed complete.')
  console.log('Demo logins (password: password123):')
  console.log('  admin@zawed.com   — مدير المتجر (Admin)')
  console.log('  sara@example.com  — عميلة (Customer)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
