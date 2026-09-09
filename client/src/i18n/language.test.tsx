import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageProvider, useLanguage } from '../context/LanguageContext'

function Probe() {
  const { t, setLang } = useLanguage()
  return (
    <div>
      <p>{t('nav.home')}</p>
      <p>{t('brand.tagline')}</p>
      <button type="button" onClick={() => setLang('en')}>EN</button>
      <button type="button" onClick={() => setLang('ar')}>AR</button>
    </div>
  )
}

describe('language switching', () => {
  beforeEach(() => {
    localStorage.removeItem('bm-store-lang')
  })

  it('defaults to Arabic and sets the RTL direction', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('switches between languages and updates translation + direction', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Premium natural products, delivered across Algeria')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('ltr')

    await user.click(screen.getByRole('button', { name: 'AR' }))
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})