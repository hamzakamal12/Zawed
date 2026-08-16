/**
 * Exercises matchFilesToProducts() against the REAL SKU list, including the
 * pairs that overlap (PEN-BL-50 / PEN-BK-50, TONER-HP85 / TONER-HP12,
 * PAP-A4-80 / PAP-A4-70). A wrong match here puts a photo on the wrong
 * product, where nobody will go looking for it.
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const out = await build({
  entryPoints: [new URL('../src/lib/productImage.ts', import.meta.url).pathname],
  bundle: true, format: 'esm', write: false, platform: 'neutral',
  external: ['@/lib/supabase', './supabase'],
})
const TMP = new URL('../node_modules/.cache/sku-match.mjs', import.meta.url).pathname
mkdirSync(dirname(TMP), { recursive: true })
writeFileSync(TMP, out.outputFiles[0].text.replace(/import[^\n]*supabase[^\n]*\n/g, 'const supabase = {};\n'))
const { matchFilesToProducts } = await import(TMP)

const SKUS = ['PAP-A4-80','PAP-A3-80','PAP-A4-70','PAP-FLIP','PAP-STICKY','PEN-BL-50','PEN-BK-50',
 'PENCIL-HB','MARKER-WB','HIGHLIGHT','FILE-BOX','FOLDER-SUS','BINDER-2','SHEET-PROT','DIVIDER',
 'TONER-HP85','TONER-HP12','INK-HP-BK','INK-HP-CL','TONER-CANON','STAPLER','STAPLES','PUNCH-2',
 'SCISSOR','TAPE-CLR','CLIP-PAPER','CALC-12','COFFEE-INST','TEA-100','SUGAR-1KG','WATER-500',
 'CUPS-PAPER','CREAMER','SANITIZER-1L','WIPES-200','TISSUE-BOX','TRASH-BAG','SOAP-LIQ','USB-32',
 'MOUSE-OPT','KB-AR','HDMI-2M','POWER-STRIP','BATTERY-AA']
const products = SKUS.map((sku, i) => ({ id: 'id-' + sku, sku, image_path: i === 0 ? 'x/1.webp' : null }))
const f = (name) => ({ name })

const cases = [
  // [filename, expected sku or null, expected reason]
  ['PAP-A4-80.jpg',              'PAP-A4-80', 'exact'],
  ['pap-a4-80.PNG',              'PAP-A4-80', 'exact'],
  ['PAP_A4_80.webp',             'PAP-A4-80', 'exact'],
  ['PAP A4 80.jpeg',             'PAP-A4-80', 'exact'],
  ['PAP-A4-80 (1).jpg',          'PAP-A4-80', 'exact'],
  ['ورق A4 - PAP-A4-80.jpg',     'PAP-A4-80', 'contained'],
  ['photo-TONER-HP85-front.jpg', 'TONER-HP85','contained'],
  // The dangerous ones: two SKUs that share a prefix must not cross-match.
  ['PEN-BL-50.jpg',              'PEN-BL-50', 'exact'],
  ['PEN-BK-50.jpg',              'PEN-BK-50', 'exact'],
  ['PAP-A4-70.jpg',              'PAP-A4-70', 'exact'],
  // Two different SKUs in one name → refuse rather than guess.
  ['PEN-BL-50-and-PEN-BK-50.jpg', null, 'ambiguous'],
  ['TONER-HP85 vs TONER-HP12.png',null, 'ambiguous'],
  // Nothing recognisable.
  ['IMG_20260815_101122.jpg',    null, 'none'],
  ['صورة.jpg',                    null, 'none'],
  ['DSC00412.JPG',               null, 'none'],
]

let fails = 0
for (const [name, wantSku, wantReason] of cases) {
  const [m] = matchFilesToProducts([f(name)], products)
  const gotSku = m.productId ? m.sku : null
  const ok = gotSku === wantSku && m.reason === wantReason
  if (!ok) fails++
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name.padEnd(32)} → ${String(gotSku).padEnd(12)} ${m.reason}` +
              (ok ? '' : `   (want ${wantSku} / ${wantReason})`))
}

// skipExisting: PAP-A4-80 already has a picture.
const [skip] = matchFilesToProducts([f('PAP-A4-80.jpg')], products, { skipExisting: true })
const skipOk = skip.productId === null && skip.reason === 'has-image'
if (!skipOk) fails++
console.log(`${skipOk ? '  ok  ' : '  FAIL'} skipExisting leaves an existing photo alone`)

// Every real SKU must round-trip to itself.
let self = 0
for (const sku of SKUS) {
  const [m] = matchFilesToProducts([f(sku + '.jpg')], products)
  if (m.sku !== sku || m.reason !== 'exact') { console.log('  FAIL self-match', sku, '→', m.sku, m.reason); fails++ }
  else self++
}
console.log(`  ok   all ${self} real SKUs match themselves exactly`)

console.log(fails ? `\n❌ ${fails} failures` : '\n✅ matcher clean')
process.exit(fails ? 1 : 0)
