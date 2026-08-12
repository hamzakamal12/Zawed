/** Ambient types for PDF dependencies that ship without their own. */

declare module 'arabic-reshaper' {
  /** Maps Arabic letters to their contextual presentation forms. */
  export function convertArabic(text: string): string
  export function convertArabicBack(text: string): string
  const _default: {
    convertArabic(text: string): string
    convertArabicBack(text: string): string
  }
  export default _default
}

declare module 'bidi-js' {
  export interface EmbeddingLevels {
    levels: Uint8Array
    paragraphs: { start: number; end: number; level: number }[]
  }
  export interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ): [number, number][]
    getMirroredCharactersMap(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ): Map<number, string>
  }
  export default function bidiFactory(): Bidi
}

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    createPdf(
      docDefinition: unknown,
      tableLayouts?: unknown,
      fonts?: unknown,
      vfs?: unknown,
    ): {
      download(fileName?: string): void
      open(): void
      getDataUrl(cb: (dataUrl: string) => void): void
      getBlob(cb: (blob: Blob) => void): void
    }
    vfs: Record<string, string>
    fonts: Record<string, unknown>
  }
  export default pdfMake
}
