/** Ambient types for pdfmake, which ships without usable ones for 0.3.x. */

declare module 'pdfmake/build/pdfmake' {
  /** pdfmake 0.3 output methods are promise-based (no callbacks). */
  export interface PdfDoc {
    download(fileName?: string): Promise<void>
    open(win?: Window | null): Promise<void>
    getDataUrl(): Promise<string>
    getBlob(): Promise<Blob>
    getBase64(): Promise<string>
  }
  export interface FontFamily {
    normal: string
    bold?: string
    italics?: string
    bolditalics?: string
  }
  const pdfMake: {
    /** Flat map of { 'File.ttf': base64 }. */
    addVirtualFileSystem(vfs: Record<string, string>): void
    /** Replaces the built-in font map (Roboto) entirely. */
    setFonts(fonts: Record<string, FontFamily>): void
    addFonts(fonts: Record<string, FontFamily>): void
    createPdf(docDefinition: unknown, options?: unknown): PdfDoc
  }
  export default pdfMake
}
