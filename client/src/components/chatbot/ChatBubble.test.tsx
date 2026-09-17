import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatBubble from './ChatBubble'
import { LanguageProvider } from '../../context/LanguageContext'
import { sendChatMessage } from '../../services/chatbot'

vi.mock('../../services/chatbot', () => ({
  sendChatMessage: vi.fn(),
}))

const sendMock = vi.mocked(sendChatMessage)

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
    sendMock.mockReset()
    sendMock.mockResolvedValue({
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
    })
  })

  it('opens without calling the chatbot API, then sends a single chat request', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(await screen.findByText(/help you find products/i)).toBeInTheDocument()
    expect(sendMock).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox'), 'honey')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('هذا المنتج متوفر')).toBeInTheDocument()
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith('honey', null)
    expect(screen.getAllByRole('link', { name: 'Honey' })[0]).toHaveAttribute('href', '/product/prod-1')
    expect(screen.getByText('Stock: 4')).toBeInTheDocument()
  })

  it('ignores a second send while a request is in flight', async () => {
    let resolveSend!: (value: Awaited<ReturnType<typeof sendChatMessage>>) => void
    sendMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve
        })
    )

    const user = userEvent.setup()
    renderChat()
    await user.click(screen.getByRole('button', { name: 'Open chat' }))
    await user.type(screen.getByRole('textbox'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(sendMock).toHaveBeenCalledTimes(1)
    resolveSend({
      sessionId: 'sess-1',
      message: 'ok',
      data: { products: [] },
    })
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })
})
