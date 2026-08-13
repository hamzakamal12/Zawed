import { useState } from 'react'
import { FileDown, Share2 } from 'lucide-react'
import { Button } from './ui'
import { useI18n } from '@/i18n/I18nProvider'
import { downloadDocument, type DocData, type DocKind } from '@/lib/pdf/documents'
import type { StringKey } from '@/i18n/strings'

const LABEL: Record<DocKind, StringKey> = {
  quotation: 'doc_quotation',
  proforma: 'doc_proforma',
  invoice: 'doc_invoice',
  delivery_note: 'doc_delivery_note',
}

/**
 * Generates a document on demand. pdfmake and the Arabic TTFs are imported
 * lazily inside downloadDocument, so nothing here weighs on first load.
 */
export function DocumentButton({
  build,
  kind,
  size = 'sm',
}: {
  build: () => DocData
  kind: DocKind
  size?: 'sm' | 'md'
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await downloadDocument(build())
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size={size} onClick={run} disabled={busy}>
      <FileDown size={14} />
      {busy ? t('loading') : t(LABEL[kind])}
    </Button>
  )
}

/**
 * WhatsApp is how quotations actually reach customers here, so the share link
 * carries the document summary as text. (A PDF cannot be attached from a web
 * link; the customer downloads it separately.)
 */
export function WhatsAppShare({ text, phone }: { text: string; phone?: string | null }) {
  const { t } = useI18n()
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Button variant="outline" size="sm">
        <Share2 size={14} />
        {t('share_whatsapp')}
      </Button>
    </a>
  )
}
