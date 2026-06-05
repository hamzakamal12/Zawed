import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
const page = await ctx.newPage();

async function shot(name) {
  await page.screenshot({ path: `/tmp/demo-${name}.png` });
  console.log(`✓ ${name}`);
}

// الصفحة الرئيسية
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await shot('01-homepage');

// صفحة التسجيل
await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
await shot('02-register');

// تسجيل الدخول كمدير منظمة Hope Foundation (مع خصم 10%)
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'manager@hopefoundation.org');
await page.fill('input[type="password"]', 'password123');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });
await shot('03-dashboard');

// كتالوج المنتجات
await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
await shot('04-products-all');

// فلتر Printing
await page.click('button:has-text("Printing")').catch(() => {});
await page.waitForTimeout(1000);
await shot('05-products-printing');

// أضف منتج للسلة
await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle' });
const firstProduct = page.locator('a[href^="/products/"]').first();
await firstProduct.click();
await page.waitForLoadState('networkidle');
await shot('06-product-detail');

// أضفه للسلة
await page.fill('input[type="number"]', '5').catch(() => {});
await page.click('button:has-text("Add to cart"), button:has-text("add")').catch(() => {});
await page.waitForTimeout(1500);
await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
await shot('07-cart-with-item');

// الطلبات
await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle' });
await shot('08-orders');

// الاشتراكات
await page.goto('http://localhost:3000/subscriptions', { waitUntil: 'networkidle' });
await shot('09-subscriptions');

// تسجيل خروج ودخول كـ Admin
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'admin@zawed.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });
await shot('10-admin-dashboard');

// صفحة المنظمات
await page.goto('http://localhost:3000/admin/organizations', { waitUntil: 'networkidle' });
await shot('11-admin-organizations');

// إدارة المنتجات
await page.goto('http://localhost:3000/admin/products', { waitUntil: 'networkidle' });
await shot('12-admin-products');

// إدارة الطلبات
await page.goto('http://localhost:3000/admin/orders', { waitUntil: 'networkidle' });
await shot('13-admin-orders');

// إدارة المستخدمين
await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
await shot('14-admin-users');

await browser.close();
console.log('\nجميع اللقطات جاهزة!');
