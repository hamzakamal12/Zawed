import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Languages } from 'lucide-react'
import { useSubmitAccountRequest } from '@/hooks/documents'
import { useI18n } from '@/i18n/I18nProvider'
import { Button, Card, CardBody, Input, Label, Notice, Select, Textarea } from '@/components/ui'
import type { CompanyType } from '@/lib/database.types'

/**
 * Public sign-up for an organization.
 *
 * This is an application, not a self-service account: the platform is a
 * supplier of record, so payment terms and PO rules are agreed before anyone
 * can order. The form records the request; staff review it and create the
 * company. Deliberately short — a procurement officer filling this in on a
 * phone will abandon a long form, and everything else can be settled on the
 * call that follows.
 */
export default function RegisterPage() {
  const { t, dir, lang, toggleLang } = useI18n()
  const submit = useSubmitAccountRequest()
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType>('ngo')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [taxId, setTaxId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await submit.mutateAsync({
        companyName,
        contactName,
        email,
        phone: phone || null,
        companyType,
        city: city || null,
        taxId: taxId || null,
        notes: notes || null,
      })
      setDone(true)
    } catch (err) {
      // Postgres raises Arabic messages for the business rules.
      setError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="bg-brand-gradient grid h-9 w-9 place-items-center rounded-xl font-extrabold text-white">
              ز
            </div>
            <span className="text-sm font-extrabold text-ink">{t('brand')}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={toggleLang}>
              <Languages size={16} />
              <span className="hidden sm:inline">{t('language')}</span>
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm">
                {t('sign_in')}
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {done ? (
          <Card>
            <CardBody className="py-12 text-center">
              <CheckCircle2 size={56} className="mx-auto text-status-good" />
              <h1 className="mt-4 text-xl font-extrabold text-ink">{t('reg_done_title')}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                {t('reg_done_body')}
              </p>
              <Link to="/" className="mt-6 inline-block">
                <Button variant="outline">
                  {t('reg_back_home')}
                  <Arrow size={16} />
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                <BadgeCheck size={14} />
                {t('reg_eyebrow')}
              </span>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {t('reg_title')}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t('reg_subtitle')}</p>
            </div>

            <Card>
              <CardBody>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>{t('reg_company_name')}</Label>
                      <Input
                        required
                        minLength={2}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={t('reg_company_name_ph')}
                      />
                    </div>

                    <div>
                      <Label>{t('reg_company_type')}</Label>
                      <Select
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                      >
                        <option value="ngo">{t('ct_ngo')}</option>
                        <option value="corporate">{t('ct_corporate')}</option>
                        <option value="government">{t('ct_government')}</option>
                        <option value="sme">{t('ct_sme')}</option>
                      </Select>
                    </div>

                    <div>
                      <Label hint={t('optional')}>{t('reg_city')}</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>

                    <div>
                      <Label>{t('reg_contact_name')}</Label>
                      <Input
                        required
                        minLength={2}
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>{t('email')}</Label>
                      <Input
                        required
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="procurement@example.org"
                      />
                    </div>

                    <div>
                      <Label hint={t('optional')}>{t('reg_phone')}</Label>
                      <Input
                        dir="ltr"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09xxxxxxxx"
                      />
                    </div>

                    <div>
                      <Label hint={t('optional')}>{t('reg_tax_id')}</Label>
                      <Input dir="ltr" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                    </div>

                    <div className="sm:col-span-2">
                      <Label hint={t('optional')}>{t('reg_notes')}</Label>
                      <Textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('reg_notes_ph')}
                      />
                    </div>
                  </div>

                  {error && <Notice tone="danger">{error}</Notice>}

                  <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
                    {submit.isPending ? t('sending') : t('reg_submit')}
                  </Button>

                  <p className="text-center text-xs text-muted">{t('reg_footnote')}</p>
                </form>
              </CardBody>
            </Card>
          </>
        )}
      </main>

      <footer className="pb-10 text-center text-xs text-muted" dir={dir}>
        © {new Date().getFullYear()} {t('brand')} — {lang === 'ar' ? t('lp_footer_rights') : 'All rights reserved'}
      </footer>
    </div>
  )
}
