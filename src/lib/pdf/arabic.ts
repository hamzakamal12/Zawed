/**
 * Arabic text handling for generated PDFs.
 *
 * The usual advice is to pre-process Arabic before handing it to a PDF
 * library: map every letter to its contextual presentation form
 * (U+FE70–U+FEFF) and reorder the string visually with the bidi algorithm.
 * That advice does not apply here, and following it actively breaks output.
 *
 * pdfmake 0.3 renders through pdfkit, which lays text out with fontkit —
 * and fontkit runs a full OpenType shaping engine. Given the original
 * Unicode it applies the font's GSUB rules (init/medi/fina/isol), joins the
 * letters, and reverses the glyph order for right-to-left runs while
 * leaving embedded digits and Latin left-to-right.
 *
 * Measured on the real pipeline (see git history for the harness):
 *
 *   raw text        → correct joining, correct word order, and the PDF keeps
 *                     real Unicode, so the document stays searchable and
 *                     copy-pasteable.
 *   bidi reorder    → fontkit then shapes a reversed string and produces the
 *                     wrong contextual forms.
 *   reshaped        → depends on the font shipping the legacy presentation
 *                     forms. Cairo is missing U+FE8D (isolated alef), which
 *                     came out as U+0000 (.notdef) in the content stream.
 *
 * So text is passed through untouched. This wrapper is kept as the single
 * seam where that decision lives, and to document why it is a no-op.
 */
export function shapeArabic(input: string): string {
  return input ?? ''
}

/** Alias used throughout the document templates. */
export const ar = shapeArabic
