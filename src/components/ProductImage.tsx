import { useState } from 'react'
import clsx from 'clsx'
import { productImageUrl } from '@/lib/productImage'
import { CategoryGlyph } from './CategoryGlyph'

/**
 * A product's picture, or the category glyph when it has none.
 *
 * Three things this has to get right, all of them about the same thing —
 * never moving the layout after it has been drawn:
 *
 *   · the box is sized by the caller and the image fills it, so the tile is
 *     the same height before and after the picture arrives (CLS);
 *   · a product with no picture renders the glyph, not an empty box, so a
 *     half-photographed catalog does not look broken;
 *   · a picture that fails to load falls back to the same glyph instead of
 *     the browser's broken-image icon.
 *
 * `object-contain` rather than `cover`: these are catalogue photographs of
 * boxes and reams, usually on white, and cropping them to fill a tile cuts
 * off the part that identifies the product.
 */
export function ProductImage({
  path,
  alt,
  icon,
  className,
  glyphSize = 28,
  eager = false,
}: {
  path: string | null | undefined
  alt: string
  icon?: string | null
  className?: string
  glyphSize?: number
  /** Set on the one image above the fold; everything else stays lazy. */
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const url = productImageUrl(path)

  if (!url || failed) {
    return (
      <div className={clsx('relative flex items-center justify-center bg-primary-50', className)}>
        <div className="bg-dotted absolute inset-0 opacity-60" aria-hidden />
        <CategoryGlyph icon={icon ?? null} size={glyphSize} className="relative text-primary-500" />
      </div>
    )
  }

  return (
    <div className={clsx('relative bg-white', className)}>
      <img
        src={url}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
