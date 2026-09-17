import { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { MessageCircle, Send, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { sendChatMessage } from '../../services/chatbot'
import type { ChatHandoff } from '../../services/chatbot'
import ChatProductCard from './ChatProductCard'
import TypingIndicator from './TypingIndicator'

interface ChatMessage {
  id: string
  type: 'user' | 'bot'
  content: string
  products?: unknown[]
}

export default function ChatBubble() {
  const { t, dir } = useLanguage()
  const [open, setOpen] = useState(false)
  const sessionRef = useRef<string | null>(null)
  const sendingRef = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [handoff, setHandoff] = useState<ChatHandoff | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, loading, open])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          type: 'bot',
          content: t('chat.welcome'),
        },
      ])
    }
  }

  const handleSend = async (text?: string) => {
    const content = (text ?? draft).trim()
    if (!content || sendingRef.current) return
    sendingRef.current = true
    setDraft('')
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, type: 'user', content }])
    setLoading(true)
    try {
      const response = await sendChatMessage(content, sessionRef.current)
      if (response.sessionId) sessionRef.current = response.sessionId
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          type: 'bot',
          content: response.message,
          products: response.data?.products ?? [],
        },
      ])
      if (response.handoff) setHandoff(response.handoff)
    } catch (error) {
      let fallback = t('chat.error')
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) fallback = t('chat.busy')
        const detail = error.response?.data?.detail
        if (typeof detail === 'string' && detail.trim()) fallback = detail
      }
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, type: 'bot', content: fallback }])
    } finally {
      sendingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[70] flex flex-col items-end lg:bottom-6 lg:right-6"
      dir={dir}
    >
      {open && (
        <div
          className="pointer-events-auto mb-3 flex h-[min(72vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-lift"
          role="dialog"
          aria-labelledby={titleId}
        >
          <header className="flex items-center justify-between bg-ink-900 px-4 py-3 text-white">
            <div>
              <p id={titleId} className="font-semibold">
                {t('chat.title')}
              </p>
              <p className="text-xs text-ink-300">{handoff ? t('chat.handedOff') : t('chat.live')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label={t('chat.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {handoff && (
            <div className="border-b border-line bg-surface px-3 py-2 text-xs text-ink-700">
              {t('chat.handoffReason', { reason: handoff.reason || t('chat.handoffFallback') })}
              {handoff.whatsapp_url ? (
                <a
                  href={handoff.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block rounded-lg bg-success-600 py-2 text-center font-medium text-white"
                >
                  {t('chat.whatsapp')}
                </a>
              ) : null}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.type === 'user'
                        ? 'rounded-ee-md bg-ink-900 text-white'
                        : 'rounded-es-md border border-line bg-surface text-ink-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                {message.products && message.products.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {message.products.map((product, index) => (
                      <ChatProductCard key={`${message.id}-${index}`} product={product} onAsk={handleSend} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          <form
            className="flex gap-2 border-t border-line bg-surface p-2"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSend()
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('chat.placeholder')}
              className="input-sm flex-1"
              disabled={Boolean(handoff)}
              aria-label={t('chat.placeholder')}
            />
            <button
              type="submit"
              disabled={loading || Boolean(handoff)}
              className="rounded-xl bg-brand-700 px-3 text-white disabled:opacity-50"
              aria-label={t('chat.send')}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white shadow-lift hover:bg-ink-700"
        aria-label={open ? t('chat.close') : t('chat.open')}
        aria-expanded={open}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </div>
  )
}
