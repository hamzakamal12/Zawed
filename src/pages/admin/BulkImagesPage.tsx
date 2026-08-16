import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Images, Upload } from 'lucide-react'
import { useAdminCatalog, useBulkProductImages, type BulkUploadProgress } from '@/hooks/catalogAdmin'
import { useI18n } from '@/i18n/I18nProvider'
import { matchFilesToProducts, type SkuMatch } from '@/lib/productImage'
import { Badge, Button, Card, CardBody, CardTitle, Notice, Skeleton } from '@/components/ui'

/**
 * Attach many photos at once by naming the files after the SKU.
 *
 * The shape of this screen is deliberate: matching happens FIRST and is shown
 * in full, and nothing uploads until the operator has looked at it. Putting a
 * photo on the wrong product is close to undetectable afterwards — nobody
 * goes looking for a picture that is already there — so the moment to catch
 * it is before it is written, not after.
 */
export default function BulkImagesPage() {
  const { t, dir } = useI18n()
  const catalog = useAdminCatalog()
  const bulk = useBulkProductImages()
  const [files, setFiles] = useState<File[]>([])
  const [skipExisting, setSkipExisting] = useState(true)
  const [progress, setProgress] = useState<BulkUploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const BackIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const matches = useMemo(() => {
    const products = (catalog.data ?? []).map((p) => ({
      id: p.id,
      sku: p.sku,
      image_path: p.image_path,
    }))
    return matchFilesToProducts(files, products, { skipExisting })
  }, [files, catalog.data, skipExisting])

  const ready = matches.filter((m) => m.productId)
  const problems = matches.filter((m) => !m.productId)

  const run = async () => {
    setError(null)
    setProgress({ done: 0, total: ready.length, failures: [] })
    try {
      await bulk.mutateAsync({
        items: ready.map((m) => ({ productId: m.productId!, sku: m.sku!, file: m.file })),
        onProgress: setProgress,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  if (catalog.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link
        to="/admin/catalog"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
      >
        <BackIcon size={16} />
        {t('cat_title')}
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('bulk_title')}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t('bulk_subtitle')}</p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas px-4 py-10 text-center hover:border-primary-300 hover:bg-primary-50">
            <Images size={30} className="text-primary-500" aria-hidden />
            <span className="text-sm font-bold text-ink">{t('bulk_pick')}</span>
            <span className="text-xs text-muted">{t('bulk_pick_hint')}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                setProgress(null)
                setError(null)
                setFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
              className="h-4 w-4 accent-[#0a6d74]"
            />
            {t('bulk_skip_existing')}
          </label>
        </CardBody>
      </Card>

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">{t('bulk_matched', { n: ready.length })}</Badge>
            {problems.length > 0 && (
              <Badge tone="warning">{t('bulk_unmatched', { n: problems.length })}</Badge>
            )}
          </div>

          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-sm">{t('bulk_review')}</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="py-2 text-start font-semibold">{t('bulk_file')}</th>
                      <th className="py-2 text-start font-semibold">{t('sku')}</th>
                      <th className="py-2 text-end font-semibold">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <MatchRow key={`${m.file.name}-${i}`} match={m} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {progress && (
            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-ink">
                  <span>{t('bulk_progress')}</span>
                  <span dir="ltr">
                    {progress.done} / {progress.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-primary-700 transition-all"
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                {progress.done === progress.total && !bulk.isPending && (
                  <Notice tone={progress.failures.length ? 'warning' : 'success'}>
                    {progress.failures.length
                      ? t('bulk_done_with_errors', {
                          n: progress.total - progress.failures.length,
                          f: progress.failures.length,
                        })
                      : t('bulk_done', { n: progress.total })}
                  </Notice>
                )}
                {progress.failures.length > 0 && (
                  <ul className="space-y-1 text-xs text-[#a52c2c]">
                    {progress.failures.map((f) => (
                      <li key={f.sku}>
                        <span className="font-mono font-bold">{f.sku}</span> — {f.message}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}

          {error && <Notice tone="danger">{error}</Notice>}

          <Button size="lg" disabled={bulk.isPending || ready.length === 0} onClick={run}>
            <Upload size={16} />
            {bulk.isPending ? t('loading') : t('bulk_upload', { n: ready.length })}
          </Button>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function MatchRow({ match }: { match: SkuMatch }) {
  const { t } = useI18n()

  const tone =
    match.reason === 'exact' || match.reason === 'contained'
      ? 'success'
      : match.reason === 'ambiguous'
        ? 'danger'
        : 'neutral'

  const label =
    match.reason === 'exact'
      ? t('bulk_exact')
      : match.reason === 'contained'
        ? t('bulk_contained')
        : match.reason === 'ambiguous'
          ? t('bulk_ambiguous')
          : match.reason === 'has-image'
            ? t('bulk_has_image')
            : t('bulk_no_match')

  return (
    <tr className="border-b border-line/70 last:border-0">
      <td className="py-2 pe-2">
        <span className="line-clamp-1 break-all text-xs text-muted" dir="auto">
          {match.file.name}
        </span>
      </td>
      <td className="py-2 font-mono text-xs font-bold text-ink">{match.sku ?? '—'}</td>
      <td className="py-2 text-end">
        <span className="inline-flex items-center gap-1">
          {tone === 'success' ? (
            <CheckCircle2 size={13} className="text-[#0a7a0a]" aria-hidden />
          ) : match.reason === 'ambiguous' ? (
            <AlertTriangle size={13} className="text-[#a52c2c]" aria-hidden />
          ) : null}
          <Badge tone={tone}>{label}</Badge>
        </span>
      </td>
    </tr>
  )
}
