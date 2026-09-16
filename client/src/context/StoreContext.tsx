import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, Product } from '../types'
import { useLanguage } from './LanguageContext'

interface StoreContextValue {
  cart: CartItem[]
  wishlist: string[]
  cartCount: number
  cartTotal: number
  addToCart: (product: Product, quantity?: number) => { success: boolean; message?: string }
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  wishlistCount: number
  clearWishlist: () => void
  getCartStore: () => { storeId: string | null; isBmStore: boolean } | null
}

const StoreContext = createContext<StoreContextValue | null>(null)

const CART_KEY = 'bm-store-cart'
const WISHLIST_KEY = 'bm-store-wishlist'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function getProductStoreInfo(product: Product): { storeId: string | null; isBmStore: boolean } {
  // BM Store products have ownerType === 'BM_STORE' or no store field
  if (product.ownerType === 'BM_STORE' || !product.store) {
    return { storeId: null, isBmStore: true }
  }
  return { storeId: product.store, isBmStore: false }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [cart, setCart] = useState<CartItem[]>(() => load(CART_KEY, []))
  const [wishlist, setWishlist] = useState<string[]>(() => load(WISHLIST_KEY, []))

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const getCartStore = useCallback(() => {
    if (cart.length === 0) return null
    const firstProduct = cart[0].product
    return getProductStoreInfo(firstProduct)
  }, [cart])

  const addToCart = useCallback((product: Product, quantity = 1) => {
    const newProductStore = getProductStoreInfo(product)
    const currentCartStore = getCartStore()

    // Check if cart has products from a different store
    if (currentCartStore) {
      if (currentCartStore.isBmStore && !newProductStore.isBmStore) {
        return { success: false, message: t('cart.bmStoreOnly') }
      }
      if (!currentCartStore.isBmStore && newProductStore.isBmStore) {
        return { success: false, message: t('cart.bmStoreOnly') }
      }
      if (!currentCartStore.isBmStore && !newProductStore.isBmStore && currentCartStore.storeId !== newProductStore.storeId) {
        return { success: false, message: t('cart.differentStore') }
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product, quantity }]
    })
    return { success: true }
  }, [cart])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.product.id !== productId)
        : prev.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          )
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }, [])

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist])
  const clearWishlist = useCallback(() => setWishlist([]), [])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  )

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isWishlisted,
        wishlistCount: wishlist.length,
        clearWishlist,
        getCartStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}