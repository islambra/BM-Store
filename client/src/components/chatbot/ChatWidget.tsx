import { useLocation } from 'react-router-dom'
import ChatBubble from './ChatBubble'

const HIDDEN_PREFIXES = ['/admin', '/seller']

export default function ChatWidget() {
  const { pathname } = useLocation()
  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null
  }
  return <ChatBubble />
}
