import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const copy: Record<string, { key: string; paragraphs: string[] }[]> = {
  about: [
    {
      key: 'about.intro',
      paragraphs: ['about.p1', 'about.p2'],
    },
  ],
  contact: [
    {
      key: 'contact.intro',
      paragraphs: ['contact.p1', 'contact.p2'],
    },
  ],
  help: [
    {
      key: 'help.intro',
      paragraphs: ['help.p1', 'help.p2'],
    },
  ],
  privacy: [
    {
      key: 'privacy.intro',
      paragraphs: ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4'],
    },
  ],
  terms: [
    {
      key: 'terms.intro',
      paragraphs: ['terms.p1', 'terms.p2', 'terms.p3', 'terms.p4'],
    },
  ],
}

const defaultTitle: Record<string, string> = {
  about: 'footer.about',
  contact: 'footer.contact',
  help: 'footer.faq',
  privacy: 'footer.privacy',
  terms: 'footer.terms',
}

export default function InfoPage({ kind }: { kind: string }) {
  const { t } = useLanguage()
  const sections = copy[kind] ?? []

  return (
    <div className="container-app max-w-3xl pt-6 sm:pt-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        {t(defaultTitle[kind] ?? 'footer.about')}
      </h1>
      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.key} className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-lg font-bold text-ink-900">{t(section.key)}</h2>
            {section.paragraphs.map((p) => (
              <p key={p} className="mt-3 text-sm leading-relaxed text-ink-500">
                {t(p)}
              </p>
            ))}
          </section>
        ))}
        <div className="rounded-2xl bg-brand-50 p-6 text-sm text-brand-700">
          {t('auth.demo')}{' '}
          <Link to="/" className="font-bold underline-offset-2 hover:underline">
            {t('nav.home')}
          </Link>
        </div>
      </div>
    </div>
  )
}