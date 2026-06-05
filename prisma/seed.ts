import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Zawed NGO database…')

  const passwordHash = await bcrypt.hash('password123', 10)

  // NGO Organizations
  const hopeFdn = await prisma.company.upsert({
    where: { id: 'company-hope' },
    update: {},
    create: {
      id: 'company-hope',
      name: 'Hope Foundation',
      address: '12 Charitable Lane, Riyadh, Saudi Arabia',
      taxId: 'NGO-HF-001',
      phone: '+966 11 234 5678',
      email: 'procurement@hopefoundation.org',
      ngoType: 'CHARITY',
      registrationNumber: 'NGO-SA-2019-0042',
    },
  })

  const greenEarth = await prisma.company.upsert({
    where: { id: 'company-green' },
    update: {},
    create: {
      id: 'company-green',
      name: 'Green Earth Association',
      address: '500 Eco Avenue, Dubai, UAE',
      taxId: 'NGO-GE-100',
      phone: '+971 4 555 1212',
      email: 'supplies@greenearth.org',
      ngoType: 'ENVIRONMENTAL',
      registrationNumber: 'NGO-UAE-2021-0118',
    },
  })

  // Admin (platform-wide; no company)
  await prisma.user.upsert({
    where: { email: 'admin@zawed.com' },
    update: {},
    create: {
      email: 'admin@zawed.com',
      name: 'Platform Admin',
      passwordHash,
      role: 'ADMIN',
    },
  })

  // Hope Foundation users
  await prisma.user.upsert({
    where: { email: 'manager@hopefoundation.org' },
    update: {},
    create: {
      email: 'manager@hopefoundation.org',
      name: 'Aisha Al-Rashid',
      passwordHash,
      role: 'MANAGER',
      companyId: hopeFdn.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'staff@hopefoundation.org' },
    update: {},
    create: {
      email: 'staff@hopefoundation.org',
      name: 'Sam Hassan',
      passwordHash,
      role: 'STAFF',
      companyId: hopeFdn.id,
    },
  })

  // Green Earth users
  await prisma.user.upsert({
    where: { email: 'manager@greenearth.org' },
    update: {},
    create: {
      email: 'manager@greenearth.org',
      name: 'Gabriel Osei',
      passwordHash,
      role: 'MANAGER',
      companyId: greenEarth.id,
    },
  })

  // Categories
  const beverages = await prisma.category.upsert({
    where: { slug: 'beverages' },
    update: {},
    create: { name: 'Beverages', slug: 'beverages', description: 'Coffee, tea, water & juice' },
  })
  const pantry = await prisma.category.upsert({
    where: { slug: 'pantry' },
    update: {},
    create: { name: 'Pantry', slug: 'pantry', description: 'Snacks, sugar & condiments' },
  })
  const office = await prisma.category.upsert({
    where: { slug: 'office-supplies' },
    update: {},
    create: { name: 'Office Supplies', slug: 'office-supplies', description: 'Stationery & equipment' },
  })
  const printing = await prisma.category.upsert({
    where: { slug: 'printing' },
    update: {},
    create: { name: 'Printing & Imaging', slug: 'printing', description: 'Toner, ink cartridges & paper' },
  })
  const cleaning = await prisma.category.upsert({
    where: { slug: 'cleaning' },
    update: {},
    create: { name: 'Cleaning', slug: 'cleaning', description: 'Wipes, soap & sanitizer' },
  })

  const products = [
    // Beverages
    {
      sku: 'COF-AR-1KG',
      name: 'Arabica Coffee Beans — 1kg',
      description: 'Premium medium-roast Arabica for office espresso machines.',
      categoryId: beverages.id,
      stock: 80,
      lowStockThreshold: 20,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 28 },
        { minQty: 11, maxQty: 50, unitPrice: 24 },
        { minQty: 51, maxQty: null, unitPrice: 20 },
      ],
    },
    {
      sku: 'COF-NS-100',
      name: 'Nescafé Classic — 100g',
      description: 'Instant coffee sachets, perfect for break rooms.',
      categoryId: beverages.id,
      stock: 150,
      lowStockThreshold: 30,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 8 },
        { minQty: 11, maxQty: 50, unitPrice: 6.5 },
        { minQty: 51, maxQty: null, unitPrice: 5 },
      ],
    },
    {
      sku: 'TEA-GR-100',
      name: 'Green Tea Bags — 100 ct',
      description: 'Loose-leaf green tea in compostable pyramid bags.',
      categoryId: beverages.id,
      stock: 200,
      lowStockThreshold: 40,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 12 },
        { minQty: 11, maxQty: 50, unitPrice: 10 },
        { minQty: 51, maxQty: null, unitPrice: 8.5 },
      ],
    },
    {
      sku: 'TEA-BL-100',
      name: 'Black Tea Bags — 100 ct',
      description: 'Classic black tea bags, strong brew.',
      categoryId: beverages.id,
      stock: 180,
      lowStockThreshold: 35,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 10 },
        { minQty: 11, maxQty: 50, unitPrice: 8.5 },
        { minQty: 51, maxQty: null, unitPrice: 7 },
      ],
    },
    {
      sku: 'WAT-500-24',
      name: 'Mineral Water — 500ml × 24',
      description: 'Case of 24 bottles, natural mineral water.',
      categoryId: beverages.id,
      stock: 15,
      lowStockThreshold: 30,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 9 },
        { minQty: 6, maxQty: 20, unitPrice: 7.5 },
        { minQty: 21, maxQty: null, unitPrice: 6 },
      ],
    },
    {
      sku: 'WAT-1.5L-12',
      name: 'Mineral Water — 1.5L × 12',
      description: 'Case of 12 large bottles.',
      categoryId: beverages.id,
      stock: 60,
      lowStockThreshold: 20,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 11 },
        { minQty: 6, maxQty: 20, unitPrice: 9 },
        { minQty: 21, maxQty: null, unitPrice: 7.5 },
      ],
    },

    // Pantry
    {
      sku: 'BIS-CHO-500',
      name: 'Chocolate Biscuits — 500g',
      description: 'Crunchy chocolate-coated biscuits, individually wrapped.',
      categoryId: pantry.id,
      stock: 120,
      lowStockThreshold: 25,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 6 },
        { minQty: 11, maxQty: 50, unitPrice: 5 },
        { minQty: 51, maxQty: null, unitPrice: 4 },
      ],
    },
    {
      sku: 'SUG-WHT-1KG',
      name: 'White Sugar — 1kg',
      description: 'Refined sugar for pantry restocking.',
      categoryId: pantry.id,
      stock: 60,
      lowStockThreshold: 15,
      tiers: [
        { minQty: 1, maxQty: 20, unitPrice: 3 },
        { minQty: 21, maxQty: null, unitPrice: 2.4 },
      ],
    },

    // Printing & Imaging
    {
      sku: 'TNR-HP-BK',
      name: 'HP LaserJet Toner — Black',
      description: 'Compatible black toner cartridge for HP LaserJet series (~2,000 pages).',
      categoryId: printing.id,
      stock: 45,
      lowStockThreshold: 10,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 55 },
        { minQty: 6, maxQty: 20, unitPrice: 48 },
        { minQty: 21, maxQty: null, unitPrice: 42 },
      ],
    },
    {
      sku: 'TNR-HP-CL',
      name: 'HP LaserJet Toner — Color Set (CMY)',
      description: 'Cyan, Magenta & Yellow toner set for HP color laser printers.',
      categoryId: printing.id,
      stock: 30,
      lowStockThreshold: 8,
      tiers: [
        { minQty: 1, maxQty: 3, unitPrice: 130 },
        { minQty: 4, maxQty: 10, unitPrice: 115 },
        { minQty: 11, maxQty: null, unitPrice: 100 },
      ],
    },
    {
      sku: 'INK-CAN-BK',
      name: 'Canon Ink Cartridge — Black',
      description: 'Original black ink cartridge for Canon PIXMA inkjet printers.',
      categoryId: printing.id,
      stock: 80,
      lowStockThreshold: 20,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 18 },
        { minQty: 6, maxQty: 20, unitPrice: 15 },
        { minQty: 21, maxQty: null, unitPrice: 12 },
      ],
    },
    {
      sku: 'INK-CAN-CL',
      name: 'Canon Ink Cartridge — Color',
      description: 'Tri-color ink cartridge for Canon PIXMA inkjet printers.',
      categoryId: printing.id,
      stock: 65,
      lowStockThreshold: 15,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 22 },
        { minQty: 6, maxQty: 20, unitPrice: 18 },
        { minQty: 21, maxQty: null, unitPrice: 15 },
      ],
    },
    {
      sku: 'INK-EPS-BK',
      name: 'Epson Ink Bottle — Black (EcoTank)',
      description: 'High-capacity black ink bottle for Epson EcoTank refillable printers.',
      categoryId: printing.id,
      stock: 55,
      lowStockThreshold: 12,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 14 },
        { minQty: 6, maxQty: 20, unitPrice: 12 },
        { minQty: 21, maxQty: null, unitPrice: 10 },
      ],
    },
    {
      sku: 'PAP-A4-500',
      name: 'A4 Printer Paper — 500 sheets',
      description: '80gsm white printer paper, FSC certified.',
      categoryId: printing.id,
      stock: 200,
      lowStockThreshold: 50,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 8 },
        { minQty: 11, maxQty: 50, unitPrice: 6.5 },
        { minQty: 51, maxQty: null, unitPrice: 5.5 },
      ],
    },
    {
      sku: 'PAP-A4-5REAM',
      name: 'A4 Printer Paper — Box of 5 Reams (2,500 sheets)',
      description: '80gsm white paper, bulk box of 5 reams.',
      categoryId: printing.id,
      stock: 80,
      lowStockThreshold: 15,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 35 },
        { minQty: 6, maxQty: 20, unitPrice: 30 },
        { minQty: 21, maxQty: null, unitPrice: 26 },
      ],
    },

    // Office Supplies
    {
      sku: 'PEN-BLK-50',
      name: 'Ballpoint Pens — Black (50 pack)',
      description: 'Smooth-write black ballpoint pens, 50 per box.',
      categoryId: office.id,
      stock: 75,
      lowStockThreshold: 20,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 15 },
        { minQty: 11, maxQty: 50, unitPrice: 12.5 },
        { minQty: 51, maxQty: null, unitPrice: 10 },
      ],
    },
    {
      sku: 'NOTE-A5',
      name: 'A5 Lined Notebook',
      description: '96-page lined notebook, soft cover.',
      categoryId: office.id,
      stock: 8,
      lowStockThreshold: 20,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 5 },
        { minQty: 11, maxQty: 50, unitPrice: 4 },
        { minQty: 51, maxQty: null, unitPrice: 3.25 },
      ],
    },
    {
      sku: 'USB-32GB',
      name: 'USB Flash Drive — 32GB',
      description: 'USB 3.0 flash drive, 32GB capacity.',
      categoryId: office.id,
      stock: 40,
      lowStockThreshold: 10,
      tiers: [
        { minQty: 1, maxQty: 5, unitPrice: 12 },
        { minQty: 6, maxQty: 20, unitPrice: 10 },
        { minQty: 21, maxQty: null, unitPrice: 8 },
      ],
    },

    // Cleaning
    {
      sku: 'SAN-1L',
      name: 'Hand Sanitizer — 1L',
      description: '70% alcohol hand sanitizer pump bottle.',
      categoryId: cleaning.id,
      stock: 40,
      lowStockThreshold: 15,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 11 },
        { minQty: 11, maxQty: 50, unitPrice: 9 },
        { minQty: 51, maxQty: null, unitPrice: 7.5 },
      ],
    },
    {
      sku: 'WIPE-200',
      name: 'Disinfectant Wipes — 200 ct',
      description: 'Multi-surface antibacterial wipes, 200 per tub.',
      categoryId: cleaning.id,
      stock: 0,
      lowStockThreshold: 10,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 9 },
        { minQty: 11, maxQty: null, unitPrice: 7.5 },
      ],
    },
  ]

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } })
    if (existing) continue
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        priceTiers: { create: p.tiers },
      },
    })
  }

  console.log('Seed complete.')
  console.log('Demo logins (password: password123):')
  console.log('  admin@zawed.com                  — System Admin')
  console.log('  manager@hopefoundation.org        — Procurement Manager (Hope Foundation, verified NGO, 10% discount)')
  console.log('  staff@hopefoundation.org          — Staff (Hope Foundation)')
  console.log('  manager@greenearth.org            — Procurement Manager (Green Earth, pending verification)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
