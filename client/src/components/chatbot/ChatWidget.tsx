import { useLocation } from 'react-router-dom'
import ChatBubble from './ChatBubble'
import { isStoreSubdomain } from '../../utils/storeUrl'

// The assistant is only offered on the main browsing pages: Home, Categories,
// Special Offers and Best Sellers. It stays hidden on auth pages, product /
// cart / checkout, dashboards and store fronts.
const VISIBLE_PATHS = ['/', '/categories', '/special-offers', '/best-sellers']

export default function ChatWidget() {
  const { pathname } = useLocation()
  if (isStoreSubdomain()) return null
  if (!VISIBLE_PATHS.includes(pathname)) return null
  return <ChatBubble />
}
