import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'

vi.mock('./services/api', () => ({
  getMe: () => Promise.reject(new Error('no session')),
  getShopConfig: () => Promise.resolve({ deliveryFee: 350 }),
  isSessionKnownDead: () => false,
  markSessionAlive: () => {},
  markSessionDead: () => {},
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'error'),
  trackReferral: () => Promise.resolve({ referralId: 'x' }),
  default: {},
}))

describe('App routing', () => {
  beforeEach(() => {
    localStorage.setItem('bm-store-lang', 'en')
    sessionStorage.clear()
  })

  it('renders the home page with header content', async () => {
    render(<App />)
    expect(screen.getByText('Best Selling')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Account' }).some((l) => l.getAttribute('href') === '/login')).toBe(true)
  })

  it('navigates to a routed page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('link', { name: 'Categories' })[0])
    expect(window.location.pathname).toBe('/categories')
  })

  it('renders a fallback for unknown routes', () => {
    window.history.replaceState({}, '', '/does-not-exist')
    render(<App />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('shows the chatbot bubble on marketplace pages', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Open chat' })).toBeInTheDocument()
  })

  it('hides the chatbot bubble on auth pages', () => {
    window.history.replaceState({}, '', '/login')
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Open chat' })).not.toBeInTheDocument()
  })

  it('hides the chatbot bubble outside the main browsing pages', () => {
    window.history.replaceState({}, '', '/cart')
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Open chat' })).not.toBeInTheDocument()
  })
})
