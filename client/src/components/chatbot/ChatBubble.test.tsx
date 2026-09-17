import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatBubble from './ChatBubble'
import { LanguageProvider } from '../../context/LanguageContext'

vi.mock('../../services/chatbot', () => ({
  createChatSession: () => Promise.resolve({ sessionId: 'sess-1' }),
  sendChatMessage: () =>
    Promise.resolve({
      sessionId: 'sess-1',
      message: 'هذا المنتج متوفر',
      data: {
        products: [
          {
            _id: 'prod-1',
            name: 'Honey',
            nameAr: 'عسل',
            price: 900,
            images: ['https://example.com/honey.jpg'],
            categoryName: 'Food',
            stock: 4,
          },
        ],
      },
    }),
}))

function renderChat() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <ChatBubble />
      </LanguageProvider>
    </MemoryRouter>
  )
}

describe('ChatBubble', () => {
  beforeEach(() => {
    localStorage.setItem('bm-store-lang', 'en')
  })

  it('opens, sends a message, and renders a BM Store product card', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(await screen.findByText(/help you find products/i)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), 'honey')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('هذا المنتج متوفر')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Honey' })[0]).toHaveAttribute('href', '/product/prod-1')
    expect(screen.getByText('Stock: 4')).toBeInTheDocument()
  })
})
