import { useLocation } from 'react-router-dom'
import ChatBubble from './ChatBubble'
import { isStoreSubdomain } from '../../utils/storeUrl'

const HIDDEN_PREFIXES = ['/admin', '/seller', '/store']

export default function ChatWidget() {
  const { pathname } = useLocation()
  if (isStoreSubdomain()) return null
  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null
  }
  return <ChatBubble />
}
