import axios from 'axios'

const chatbotApi = axios.create({
  baseURL: import.meta.env.VITE_CHATBOT_API_URL ?? 'https://bm-store-vywx.onrender.com',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

export interface ChatHandoff {
  reason?: string
  summary?: string
  whatsapp_url?: string
  notified?: boolean
}

export interface ChatResponse {
  sessionId: string
  message: string
  data?: { products?: unknown[] }
  tools?: unknown[]
  handoff?: ChatHandoff | null
}

export interface ChatSession {
  sessionId: string
}

export async function createChatSession(): Promise<ChatSession> {
  const response = await chatbotApi.post<ChatSession>('/api/session')
  return response.data
}

export async function sendChatMessage(message: string, sessionId: string): Promise<ChatResponse> {
  const response = await chatbotApi.post<ChatResponse>('/api/chat', { message, sessionId })
  return response.data
}

export default chatbotApi
