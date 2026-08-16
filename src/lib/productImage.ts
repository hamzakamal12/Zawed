import { supabase } from './supabase'

export const PRODUCT_IMAGE_BUCKET = 'product-images'

/**
 * Public URL for a stored path.
 *
 * The database holds the path, not the URL — see migration 16 — so this is
 * where the two are joined. Returns null for a product with no picture so the
 * caller can fall back to the category glyph rather than render a broken img.
 */
export function productImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Longest edge after downscaling. Enough for the product page at 2× DPR. */
const MAX_EDGE = 900
/** WebP quality. 0.8 is where photographs of stationery stop improving. */
const QUALITY = 0.8

export interface PreparedImage {
  blob: Blob
  contentType: string
  width: number
  height: number
  /** Bytes before compression, so the UI can show what it saved. */
  originalBytes: number
}

/**
 * Downscale and re-encode before upload.
 *
 * This is not a nicety. A photo straight off a phone is 3–6 MB; the catalog
 * shows a dozen of them at once, and the people using this platform are on
 * Sudanese mobile data. Uploading the original would make the catalog
 * unusable for the customer while costing the admin nothing visible — the
 * classic shape of a performance problem nobody notices until it is everywhere.
 *
 * Runs in the browser, so the big file never crosses the network at all.
 */
export async function prepareProductImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('الملف ليس صورة')
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('تعذّرت قراءة الصورة')
  })

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذّرت معالجة الصورة')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // Safari only gained canvas WebP encoding in 14; toBlob hands back a PNG
  // instead of failing, which would be several times larger than the JPEG we
  // would have chosen. Check what actually came out rather than what we asked
  // for.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  const usable =
    blob && blob.type === 'image/webp'
      ? blob
      : await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', QUALITY),
        )

  if (!usable) throw new Error('تعذّرت معالجة الصورة')

  return {
    blob: usable,
    contentType: usable.type,
    width,
    height,
    originalBytes: file.size,
  }
}

/**
 * Uploads under a fresh name every time rather than overwriting.
 *
 * An overwrite leaves every browser and proxy that already cached the old
 * picture showing it, for as long as they feel like — and the one person who
 * will not see the stale image is the admin who just uploaded, so the bug is
 * invisible from where it is created. A new path sidesteps caching entirely;
 * the old file is swept by the orphan trigger.
 */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const prepared = await prepareProductImage(file)
  const ext = prepared.contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${productId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, prepared.blob, {
      contentType: prepared.contentType,
      // A year: the path changes whenever the picture does, so nothing stale
      // can be served under it.
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw new Error(error.message)
  return path
}

/* ------------------------------------------------------------------ */
/* Bulk matching                                                       */
/* ------------------------------------------------------------------ */

export interface SkuMatch {
  file: File
  /** Null when nothing matched, or when the filename was ambiguous. */
  productId: string | null
  sku: string | null
  reason: 'exact' | 'contained' | 'none' | 'ambiguous' | 'has-image'
}

/**
 * Reduces a filename to something comparable with a SKU.
 *
 * Photos arrive named by whatever produced them, so this absorbs the usual
 * damage: the extension, the "(1)" a second download picks up, a trailing
 * "_2" from a burst, and the difference between a space, an underscore and a
 * hyphen. Case is folded because Windows and phones disagree about it.
 */
export function normalizeForSku(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
}

/**
 * Works out which product each file belongs to.
 *
 * Exact match first. Failing that, a SKU appearing INSIDE the filename counts
 * — "ورق A4 - PAP-A4-80.jpg" is a name a human would reasonably produce. But
 * if two different SKUs both appear, the file is reported as ambiguous rather
 * than assigned to one of them: attaching a photo to the wrong product is
 * worse than attaching none, because nobody goes looking for it.
 *
 * Pure on purpose — this is the part that can quietly do damage, so it is
 * decided before anything is uploaded and shown to the operator first.
 */
export function matchFilesToProducts(
  files: File[],
  products: { id: string; sku: string; image_path: string | null }[],
  options: { skipExisting?: boolean } = {},
): SkuMatch[] {
  const bySku = new Map<string, { id: string; sku: string; image_path: string | null }>()
  for (const p of products) bySku.set(normalizeForSku(p.sku), p)
  const skus = [...bySku.keys()].sort((a, b) => b.length - a.length)

  return files.map((file) => {
    const stem = normalizeForSku(file.name)

    const exact = bySku.get(stem)
    if (exact) {
      return exact.image_path && options.skipExisting
        ? { file, productId: null, sku: exact.sku, reason: 'has-image' as const }
        : { file, productId: exact.id, sku: exact.sku, reason: 'exact' as const }
    }

    // Longest first, so "PAP-A4-80" wins over a hypothetical "PAP-A4" prefix
    // before the ambiguity check ever sees them as two separate hits.
    const hits = skus.filter((s) => stem.includes(s))
    const distinct = hits.filter((s) => !hits.some((other) => other !== s && other.includes(s)))

    if (distinct.length === 1) {
      const p = bySku.get(distinct[0])!
      return p.image_path && options.skipExisting
        ? { file, productId: null, sku: p.sku, reason: 'has-image' as const }
        : { file, productId: p.id, sku: p.sku, reason: 'contained' as const }
    }
    if (distinct.length > 1) {
      return { file, productId: null, sku: null, reason: 'ambiguous' as const }
    }
    return { file, productId: null, sku: null, reason: 'none' as const }
  })
}
