import ArabicReshaper from 'arabic-reshaper'
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

export function hasArabic(text: string): boolean {
  return ARABIC_RANGE.test(text)
}

/**
 * PDF renderers draw glyphs in the order they are given and do not perform
 * Arabic shaping or bidirectional reordering. Text handed to pdfmake must
 * therefore be pre-processed twice:
 *
 *   1. SHAPE  — map each letter to its contextual presentation form
 *               (isolated / initial / medial / final) so letters connect.
 *   2. REORDER — apply the Unicode bidi algorithm and emit the characters in
 *               visual order, right-to-left, with mirrored brackets.
 *
 * Latin runs and digits inside the string keep their left-to-right order,
 * which is what the bidi pass is for. A string with no Arabic is returned
 * untouched.
 */
export function shapeArabic(input: string): string {
  if (!input) return ''
  if (!hasArabic(input)) return input

  const shaped = ArabicReshaper.convertArabic(input)

  // Bidi works per paragraph; keep explicit line breaks intact.
  return shaped
    .split('\n')
    .map((line) => reorderVisually(line))
    .join('\n')
}

function reorderVisually(line: string): string {
  if (!line) return ''

  // baseDirection 'rtl': the paragraph is Arabic, so the base level is 1.
  const embeddingLevels = bidi.getEmbeddingLevels(line, 'rtl')
  const flips = bidi.getReorderSegments(line, embeddingLevels)

  const chars = Array.from(line)
  for (const [start, end] of flips) {
    const slice = chars.slice(start, end + 1).reverse()
    for (let i = 0; i < slice.length; i++) chars[start + i] = slice[i]
  }

  // Mirror paired punctuation (parentheses, brackets) inside RTL runs.
  const mirrored = bidi.getMirroredCharactersMap(line, embeddingLevels)
  for (const [index, ch] of mirrored) chars[index] = ch

  return chars.join('')
}

/** Convenience for building pdfmake tables where every cell needs shaping. */
export const ar = shapeArabic
