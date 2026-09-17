import React, { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import ProductCard from './ProductCard';
import TypingIndicator from './TypingIndicator';
import { createSession, sendMessage } from '../services/api';

const ChatBubble = () => {
  const [open, setOpen] = useState(false);
  const sessionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const ensureSession = async () => {
    if (sessionRef.current) return sessionRef.current;
    const session = await createSession();
    sessionRef.current = session.sessionId;
    setMessages([
      {
        id: 'welcome',
        type: 'bot',
        content: 'السلام، راني مساعدة المحل. واش تحب تلقا؟',
      },
    ]);
    return session.sessionId;
  };

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && !sessionRef.current) {
      try {
        await ensureSession();
      } catch (error) {
        setMessages([{ id: 'err', type: 'bot', content: 'السيرفر ما خدامش. شغّلي الباكند على البورت 8000.' }]);
      }
    }
  };

  const handleSend = async (text) => {
    const content = (text || draft).trim();
    if (!content || loading) return;
    setDraft('');
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', content }]);
    setLoading(true);
    try {
      const sid = await ensureSession();
      const response = await sendMessage(content, sid);
      if (response.sessionId) {
        sessionRef.current = response.sessionId;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          content: response.message,
          products: response.data?.products || [],
        },
      ]);
      if (response.handoff) setHandoff(response.handoff);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const fallback =
        error.response?.status === 429
          ? 'السيرفر مشغول دوكا، استنائي شوية وعاودي.'
          : 'صرالك مشكل، عاودي من بعد.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 2, type: 'bot', content: typeof detail === 'string' ? detail : fallback },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end" dir="rtl">
      {open && (
        <div className="mb-3 w-[min(92vw,380px)] h-[min(72vh,560px)] bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">مساعدة</p>
              <p className="text-xs text-slate-300">{handoff ? 'تحوّلت لصاحب المحل' : 'دردشة مباشرة'}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/10">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </header>

          {handoff && (
            <div className="bg-slate-100 text-slate-800 text-xs px-3 py-2 border-b border-slate-200">
              صاحب المحل يرد عليك قريب. السبب: {handoff.reason}
              {handoff.whatsapp_url ? (
                <a
                  href={handoff.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-2 text-center bg-emerald-600 text-white rounded-lg py-2 font-medium"
                >
                  كمّلي على WhatsApp
                </a>
              ) : null}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.type === 'user'
                        ? 'bg-slate-800 text-white rounded-tr-md'
                        : 'bg-white text-slate-800 rounded-tl-md border border-slate-200'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                {message.products?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {message.products.map((product) => (
                      <ProductCard key={product.id} product={product} onAsk={handleSend} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          <form
            className="p-2 bg-white border-t border-slate-200 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="اكتبي سؤالك..."
              className="flex-1 rounded-xl border-slate-200 text-sm"
              disabled={Boolean(handoff)}
            />
            <button
              type="submit"
              disabled={loading || Boolean(handoff)}
              className="bg-teal-700 text-white rounded-xl px-3 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg flex items-center justify-center hover:bg-slate-700"
        aria-label="افتح الدردشة"
      >
        {open ? <XMarkIcon className="w-7 h-7" /> : <ChatBubbleLeftRightIcon className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default ChatBubble;
