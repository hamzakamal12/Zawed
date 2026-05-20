import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Zawed database…')

  const passwordHash = await bcrypt.hash('password123', 10)

  // Companies
  const acme = await prisma.company.upsert({
    where: { id: 'company-acme' },
    update: {},
    create: {
      id: 'company-acme',
      name: 'Acme Corporation',
      address: '123 Industrial Park, Riyadh, Saudi Arabia',
      taxId: 'TAX-AC-001',
      phone: '+966 11 234 5678',
      email: 'orders@acme.example.com',
    },
  })

  const globex = await prisma.company.upsert({
    where: { id: 'company-globex' },
    update: {},
    create: {
      id: 'company-globex',
      name: 'Globex Industries',
      address: '500 Business Bay, Dubai, UAE',
      taxId: 'TAX-GX-100',
      phone: '+971 4 555 1212',
      email: 'procurement@globex.example.com',
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

  // Acme users
  await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: {},
    create: {
      email: 'manager@acme.com',
      name: 'Aisha Manager',
      passwordHash,
      role: 'MANAGER',
      companyId: acme.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'staff@acme.com' },
    update: {},
    create: {
      email: 'staff@acme.com',
      name: 'Sam Staff',
      passwordHash,
      role: 'STAFF',
      companyId: acme.id,
    },
  })

  // Globex users
  await prisma.user.upsert({
    where: { email: 'manager@globex.com' },
    update: {},
    create: {
      email: 'manager@globex.com',
      name: 'Gabriel Manager',
      passwordHash,
      role: 'MANAGER',
      companyId: globex.id,
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
  const cleaning = await prisma.category.upsert({
    where: { slug: 'cleaning' },
    update: {},
    create: { name: 'Cleaning', slug: 'cleaning', description: 'Wipes, soap & sanitizer' },
  })

  const products = [
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
      sku: 'PAP-A4-500',
      name: 'A4 Printer Paper — 500 sheets',
      description: '80gsm white printer paper, FSC certified.',
      categoryId: office.id,
      stock: 200,
      lowStockThreshold: 50,
      tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 8 },
        { minQty: 11, maxQty: 50, unitPrice: 6.5 },
        { minQty: 51, maxQty: null, unitPrice: 5.5 },
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
  console.log('  admin@zawed.com     — System Admin')
  console.log('  manager@acme.com    — Procurement Manager (Acme)')
  console.log('  staff@acme.com      — Staff (Acme)')
  console.log('  manager@globex.com  — Procurement Manager (Globex)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
