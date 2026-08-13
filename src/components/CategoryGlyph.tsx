import {
  Coffee,
  Cpu,
  FileText,
  Folder,
  Package,
  Paperclip,
  Pen,
  Printer,
  SprayCan,
} from 'lucide-react'

/**
 * The seed stores a lucide icon name per category. Mapping them explicitly
 * keeps tree-shaking working — a dynamic lookup would pull in the whole icon
 * set, which is far too much weight for a 3G-first app.
 */
const ICONS = {
  'file-text': FileText,
  pen: Pen,
  folder: Folder,
  printer: Printer,
  paperclip: Paperclip,
  coffee: Coffee,
  spray: SprayCan,
  cpu: Cpu,
} as const

export function CategoryGlyph({
  icon,
  size = 16,
  className,
}: {
  icon: string | null | undefined
  size?: number
  className?: string
}) {
  const Icon = (icon && ICONS[icon as keyof typeof ICONS]) || Package
  return <Icon size={size} className={className} />
}
