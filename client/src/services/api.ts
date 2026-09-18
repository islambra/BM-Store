import axios from 'axios'
import type { ApiResponse } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
})

// Once a refresh attempt confirms there is no live session (guest), stop
// retrying /auth/me -> /auth/refresh on every navigation or page load.
let sessionKnownDead = false

export function isSessionKnownDead() {
  return sessionKnownDead
}

export function markSessionAlive() {
  sessionKnownDead = false
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const url = original?.url ?? ''
    const isAuth = ['/auth/login', '/auth/register', '/auth/register-marketer', '/auth/refresh'].some((p) => url.includes(p))
    if (err.response?.status === 401 && original && !original._retry && !isAuth) {
      if (sessionKnownDead) return Promise.reject(err)
      original._retry = true
      try {
        await api.post('/auth/refresh')
        markSessionAlive()
        return api(original)
      } catch {
        sessionKnownDead = true
        /* refresh failed — session truly expired, avoid repeating it */
      }
    }
    return Promise.reject(err)
  }
)

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? err.message
  }
  return 'Something went wrong'
}

export interface User {
  id: string
  name: string
  role: 'USER' | 'MARKETER' | 'SELLER' | 'ADMIN'
  avatar: string | null
  phone: string | null
  createdAt: string
  ccp?: string | null
  ccpKey?: string | null
  baridiMob?: string | null
}

// ---- helpers -------------------------------------------------------------

interface Page {
  page: number
  limit: number
  total: number
  pages: number
}

async function get<T>(path: string): Promise<T> {
  const res = await api.get<ApiResponse<T>>(path)
  return res.data?.data as T
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(path, body)
  return res.data?.data as T
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiResponse<T>>(path, body)
  return res.data?.data as T
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiResponse<T>>(path, body)
  return res.data?.data as T
}

async function remove<T = null>(path: string): Promise<T> {
  const res = await api.delete<ApiResponse<T>>(path)
  return res.data?.data as T
}

// ---- auth ----------------------------------------------------------------

export interface AuthPayload {
  user: User
}

export function getMe() {
  return get<{ user: User | null }>('/auth/me')
}

export function updateMe(body: { name?: string; phone?: string; avatar?: string; ccp?: string; ccpKey?: string; baridiMob?: string }) {
  return patch<AuthPayload>('/auth/me', body)
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return patch<null>('/auth/password', body)
}

export function login(phone: string, password: string) {
  return post<AuthPayload>('/auth/login', { phone, password }).then((res) => {
    markSessionAlive()
    return res
  })
}

export function register(name: string, phone: string, password: string, opts?: { referralId?: string; visitorId?: string }) {
  return post<AuthPayload>('/auth/register', {
    name,
    phone,
    password,
    referralId: opts?.referralId,
    visitorId: opts?.visitorId,
  }).then((res) => {
    markSessionAlive()
    return res
  })
}

export interface RegisterMarketerInput {
  name: string
  phone: string
  password: string
  baridiMob?: string
  ccp?: string
  ccpKey?: string
}

export function registerMarketer(body: RegisterMarketerInput) {
  return post<BecomeMarketerPayload>('/auth/register-marketer', body).then((res) => {
    markSessionAlive()
    return res
  })
}

export function logout() {
  return post<null>('/auth/logout').then((res) => {
    sessionKnownDead = true
    return res
  })
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await api.post<ApiResponse<{ url: string }>>('/admin/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const url = res.data?.data?.url ?? ''
  if (!url) throw new Error('Upload failed')
  if (url.startsWith('http')) return { url }
  const origin = (() => {
    try {
      return new URL(api.defaults.baseURL ?? '', window.location.origin).origin
    } catch {
      return window.location.origin
    }
  })()
  return { url: `${origin}${url.startsWith('/') ? url : `/${url}`}` }
}

export interface BecomeMarketerPayload extends AuthPayload {
  marketer: {
    referralCode: string
    referralLink: string
    publicName: string
    status: string
  }
}

export function becomeMarketer() {
  return post<BecomeMarketerPayload>('/auth/become-marketer').then((res) => {
    markSessionAlive()
    return res
  })
}

// ---- public catalog ------------------------------------------------------

export interface CategoryRecord {
  _id: string
  slug: string
  name: string
  nameAr?: string
  nameFr?: string
  image: string
  icon: string
  order: number
  active: boolean
  productCount?: number
}

export interface ProductRecord {
  _id: string
  slug: string
  name: string
  nameAr?: string
  nameFr?: string
  description?: string
  descriptionAr?: string
  descriptionFr?: string
  price: number
  oldPrice?: number
  image: string
  images: string[]
  thumbnail?: string
  category: string
  categoryName: string
  discount: number
  tags?: string[]
  isFeatured: boolean
  isSpecialOffer?: boolean
  confirmedSales?: number
  stock?: number
  ownerType?: 'BM_STORE' | 'SELLER'
  store?: string
  seller?: string
}

export interface BannerRecord {
  _id: string
  image: string
  link?: string
  badgeEn?: string
  titleEn?: string
  subtitleEn?: string
  ctaEn?: string
  badgeFr?: string
  titleFr?: string
  subtitleFr?: string
  ctaFr?: string
  badgeAr?: string
  titleAr?: string
  subtitleAr?: string
  ctaAr?: string
  active: boolean
  order: number
}

export function getCategories() {
  return get<CategoryRecord[]>('/categories')
}

export function getShopConfig() {
  return get<{ deliveryFee: number }>('/config')
}

export interface WilayaRecord {
  _id: string
  code: string
  name: string
  nameAr?: string
  deliveryPrice: number
  isActive?: boolean
}

export function getWilayas() {
  return get<WilayaRecord[]>('/wilayas')
}

export function getBanners() {
  return get<BannerRecord[]>('/banners')
}

export async function listProducts(params?: {
  category?: string
  q?: string
  sort?: string
  page?: number
  limit?: number
  minPrice?: number
  maxPrice?: number
  featured?: boolean
  offer?: boolean
}) {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.q) qs.set('q', params.q)
  if (params?.sort) qs.set('sort', params.sort)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.minPrice !== undefined) qs.set('minPrice', String(params.minPrice))
  if (params?.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice))
  if (params?.featured !== undefined) qs.set('featured', String(params.featured))
  if (params?.offer !== undefined) qs.set('offer', String(params.offer))
  const q = qs.toString()
  const res = await api.get<ApiResponse<Page & { products: ProductRecord[] }>>(`/products${q ? `?${q}` : ''}`)
  return res.data?.data as Page & { products: ProductRecord[] }
}

export function getProductById(id: string) {
  return get<ProductRecord>(`/products/${id}`)
}

export function getProductBySlug(slug: string) {
  return get<ProductRecord>(`/products/slug/${slug}`)
}

// ---- orders (customer) ---------------------------------------------------

export interface CreateOrderInput {
  items: { productId: string; qty: number }[]
  referralId?: string
  /** Browser visitor id — lets the server verify the referral belongs to this visitor. */
  visitorId?: string
  /** Stable idempotency key for one checkout attempt (retries reuse it). */
  clientKey?: string
  customer: {
    fullName: string
    phone: string
    /** Wilaya `_id` from `/wilayas` — the server resolves name/code/price. */
    wilayaId?: string
    /** Legacy fallback: wilaya code (kept for backwards compatibility). */
    wilaya?: string
    wilayaName?: string
    commune: string
    address: string
    note?: string
  }
}

export function createOrder(body: CreateOrderInput) {
  return post<Record<string, unknown>>('/orders', body)
}

export interface MyOrderRecord {
  _id: string
  orderRef: string
  /** Customer's personal reward order number (1, 2, ...). Assigned at confirmation. */
  customerOrderNumber?: number
  /** Blended reward discount percent applied at confirmation. */
  discountPercent?: number
  /** Blended reward discount amount in DZD. */
  discountAmount?: number
  /** Legacy per-product reward discount (pre-discount-system orders only). */
  rewardDiscount?: number
  items: {
    productId: string
    name: string
    qty: number
    price: number
    image?: string
    category?: string
    discountPercent?: number
    discountAmount?: number
    isRewardMilestone?: boolean
  }[]
  customer: {
    fullName: string
    phone: string
    wilaya: string
    /** Wilaya snapshot frozen at order time (may be absent on legacy orders). */
    wilayaId?: string
    wilayaCode?: string
    wilayaName?: string
    deliveryPrice?: number
    commune: string
    address: string
    note?: string
  }
  subtotal: number
  delivery: number
  total: number
  status: string
  createdAt: string
}

export function getMyOrders() {
  return get<{ orders: MyOrderRecord[]; nextCustomerOrderNumber: number }>('/orders/me')
}

export function updateMyOrder(
  id: string,
  body: {
    items?: { productId: string; qty: number }[]
    customer?: {
      /** Wilaya `_id` from `/wilayas` — server resolves the snapshot. */
      wilayaId?: string
      /** Legacy fallback: wilaya code. */
      wilaya?: string
      wilayaName?: string
      commune?: string
      address?: string
      note?: string
    }
  },
) {
  return patch<{ order: MyOrderRecord }>(`/orders/${id}`, body)
}

export function deleteMyOrder(id: string) {
  return remove<null>(`/orders/${id}`)
}

// ---- marketer ------------------------------------------------------------

export interface MarketerStats {
  visits: number
  customers: number
  orders: number
  deliveredOrders: number
  pendingEarnings: number
  availableBalance: number
  payoutRequested: number
  paymentSent: number
  totalPaid: number
  disputed: number
  cancelled: number
  totalEarnings: number
}

export interface MarketerProfilePayload {
  profile: {
    id: string
    publicName: string
    referralCode: string
    referralLink: string
    status: string
    payoutDetails: { ccp?: string; ccpKey?: string; baridiMob?: string }
    totalEarnings: number
    createdAt: string
    user?: { id: string; name: string; phone?: string; avatar?: string | null }
  }
  stats: MarketerStats
  baseUrl: string
}

export interface MarketerOrderRecord {
  id: string
  orderRef: string
  status: string
  items?: { name: string; qty: number }[]
  subtotal: number
  total: number
  createdAt: string
  commission: {
    _id: string
    orderId?: string
    amount: number
    status: string
    availableAt?: string | null
    createdAt: string
  } | null
}

export interface MarketerPayoutRecord {
  _id: string
  amount: number
  method: 'CCP' | 'BaridiMob'
  reference?: string
  status: 'sent' | 'received' | 'disputed' | 'cancelled'
  notes?: string
  commissions?: string[]
  createdAt: string
  sentAt?: string
  confirmedAt?: string
  disputedAt?: string
  cancelledAt?: string
}

export interface MarketerDashboardPayload {
  profile: MarketerProfilePayload['profile']
  stats: MarketerStats
  referralLink: string
  baseUrl: string
  recentOrders: MarketerOrderRecord[]
  recentPayouts: MarketerPayoutRecord[]
}

export function getMarketerMe() {
  return get<MarketerProfilePayload>('/marketer/me')
}

export function updateMarketerMe(body: {
  name?: string
  phone?: string
  publicName?: string
  payoutDetails?: { ccp?: string; ccpKey?: string; baridiMob?: string }
}) {
  return patch<MarketerProfilePayload>('/marketer/me', body)
}

export interface CommissionRecord {
  _id: string
  orderId?: string
  order?: { _id: string; orderRef: string; total: number; createdAt: string } | null
  rate: number
  amount: number
  status: string
  createdAt: string
  availableAt?: string | null
  paidAt?: string | null
}

export function getMarketerDashboard() {
  return get<MarketerDashboardPayload>('/marketer/dashboard')
}

export function getMarketerOrders(params?: { page?: number; limit?: number; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<Page & { orders: MarketerOrderRecord[] }>(`/marketer/orders${q ? `?${q}` : ''}`)
}

export function getMarketerEarnings() {
  return get<{ commissions: CommissionRecord[]; buckets: MarketerStats }>('/marketer/earnings')
}

export function getMarketerPayments() {
  return get<{ payouts: MarketerPayoutRecord[] }>('/marketer/payments')
}

export function confirmPayoutReceived(id: string) {
  return post<{ payout: MarketerPayoutRecord }>(`/marketer/payments/${id}/confirm-received`)
}

export function reportPayoutNotReceived(id: string) {
  return post<{ payout: MarketerPayoutRecord }>(`/marketer/payments/${id}/report-not-received`)
}

export function deleteMarketerPayout(id: string) {
  return remove<null>(`/marketer/payments/${id}`)
}

// ---- seller ----------------------------------------------------------------

export interface SellerProfilePayload {
  seller: {
    id: string
    fullName: string
    email: string
    phone: string
    status: string
    createdAt: string
  }
  store: {
    id: string
    name: string
    slug: string
    status: string
    subscriptionPlan: string
    subscriptionEndDate: string | null
  } | null
}

export interface SellerStoreRequestPayload {
  _id: string
  sellerName: string
  sellerEmail: string
  sellerPhone: string
  storeName: string
  storeDescription?: string
  storeDescriptionAr?: string
  storeLogo?: string
  storePhone?: string
  wilaya?: string
  city?: string
  slug: string
  subscriptionPlan: 'monthly' | 'yearly'
  expectedAmount: number
  paymentProof: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  requestDate: string
  reviewedAt?: string
  reviewedBy?: string
  isRenewal: boolean
  store?: string
}

export interface SellerStorePayload {
  _id: string
  seller: string
  name: string
  slug: string
  description?: string
  descriptionAr?: string
  logo?: string
  phone?: string
  wilaya?: string
  city?: string
  status: string
  subscriptionPlan?: string
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  createdAt: string
}

export interface SellerProductPayload {
  _id: string
  name: string
  nameAr?: string
  nameFr?: string
  description?: string
  descriptionAr?: string
  descriptionFr?: string
  price: number
  oldPrice?: number
  image: string
  images: string[]
  thumbnail?: string
  category: string
  categoryName: string
  tags?: string[]
  isFeatured: boolean
  isSpecialOffer: boolean
  confirmedSales?: number
  discount: number
  ownerType: 'BM_STORE' | 'SELLER'
  store: string
  seller: string
  createdAt: string
  updatedAt: string
}

export interface SellerCategoryPayload {
  _id: string
  slug: string
  name: string
  nameAr?: string
  nameFr?: string
  image?: string
  icon?: string
  order: number
  active: boolean
  productCount?: number
  store: string
  createdAt: string
  updatedAt: string
}

export interface SellerOrderPayload {
  _id: string
  orderRef: string
  user: string
  store: string
  items: { productId: string; name: string; qty: number; price: number; image?: string }[]
  customer: {
    fullName: string
    phone: string
    wilaya: string
    wilayaName?: string
    commune: string
    address: string
    note?: string
  }
  subtotal: number
  delivery: number
  customerOrderNumber?: number
  discountPercent?: number
  discountAmount?: number
  total: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface SellerEarningsStats {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  deliveredRevenue: number
  monthlyRevenue: number
}

export interface SellerSubscriptionPayload {
  plan: string
  status: string
  startDate: string | null
  endDate: string | null
  daysRemaining: number
  isExpiringSoon: boolean
}

export interface PaymentInfoPayload {
  ccp?: string | null
  ccpKey?: string | null
  baridiMob?: string | null
}

export interface SellerPage {
  page: number
  limit: number
  total: number
  pages: number
}

export function registerSeller(body: {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}) {
  return post<{ seller: SellerProfilePayload['seller'] }>('/seller/register', body).then((res) => {
    markSessionAlive()
    return res
  })
}

export function loginSeller(identifier: string, password: string) {
  return post<{ seller: SellerProfilePayload['seller'] }>('/seller/login', { identifier, password }).then((res) => {
    markSessionAlive()
    return res
  })
}

export function logoutSeller() {
  return post<null>('/seller/logout').then((res) => {
    sessionKnownDead = true
    return res
  })
}

export function getSellerMe() {
  return get<SellerProfilePayload>('/seller/me')
}

export function updateSellerMe(body: { fullName?: string; email?: string; phone?: string }) {
  return patch<SellerProfilePayload>('/seller/me', body)
}

export function changeSellerPassword(body: { currentPassword: string; newPassword: string }) {
  return patch<null>('/seller/password', body)
}

export function submitStoreRequest(body: {
  storeName: string
  storeDescription?: string
  storeDescriptionAr: string
  storeLogo?: string
  storePhone?: string
  wilaya?: string
  city?: string
  slug: string
  subscriptionPlan: 'monthly' | 'yearly'
  paymentProof: string
}) {
  return post<{ storeRequest: SellerStoreRequestPayload }>('/seller/store-request', body)
}

export function getMyStoreRequest() {
  return get<{ storeRequest: SellerStoreRequestPayload | null; paymentInfo?: PaymentInfoPayload }>('/seller/store-request')
}

export function checkSlugAvailability(slug: string) {
  return get<{ available: boolean }>(`/seller/check-slug?slug=${encodeURIComponent(slug)}`)
}

export function getMyStore() {
  return get<{ store: SellerStorePayload }>('/store')
}

export function updateMyStore(body: {
  name?: string
  description?: string
  descriptionAr?: string
  logo?: string
  phone?: string
  wilaya?: string
  city?: string
}) {
  return patch<{ store: SellerStorePayload }>('/store', body)
}

export function listMyProducts(params?: { page?: number; limit?: number; q?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  const q = qs.toString()
  return get<SellerPage & { products: SellerProductPayload[] }>(`/store/products${q ? `?${q}` : ''}`)
}

export function getMyProduct(id: string) {
  return get<SellerProductPayload>(`/store/products/${id}`)
}

export function createMyProduct(body: Partial<SellerProductPayload>) {
  return post<SellerProductPayload>('/store/products', body)
}

export function updateMyProduct(id: string, body: Partial<SellerProductPayload>) {
  return patch<SellerProductPayload>(`/store/products/${id}`, body)
}

export function deleteMyProduct(id: string) {
  return remove<null>(`/store/products/${id}`)
}

export function listMyCategories() {
  return get<{ categories: SellerCategoryPayload[] }>('/store/categories')
}

export function createMyCategory(body: Partial<SellerCategoryPayload>) {
  return post<SellerCategoryPayload>('/store/categories', body)
}

export function updateMyCategory(id: string, body: Partial<SellerCategoryPayload>) {
  return patch<SellerCategoryPayload>(`/store/categories/${id}`, body)
}

export function deleteMyCategory(id: string) {
  return remove<null>(`/store/categories/${id}`)
}

export function listMyOrders(params?: { page?: number; limit?: number; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<SellerPage & { orders: SellerOrderPayload[] }>(`/store/orders${q ? `?${q}` : ''}`)
}

export function getMyOrder(id: string) {
  return get<{ order: SellerOrderPayload }>(`/store/orders/${id}`)
}

export function updateMyOrderStatus(id: string, status: string) {
  return patch<{ order: SellerOrderPayload }>(`/store/orders/${id}/status`, { status })
}

export function deleteMyStoreOrder(id: string) {
  return remove<null>(`/store/orders/${id}`)
}

export function getMyEarnings() {
  return get<{ stats: SellerEarningsStats }>('/store/earnings')
}

export function getMySubscription() {
  return get<{ subscription: SellerSubscriptionPayload; paymentInfo?: PaymentInfoPayload }>('/store/subscription')
}

export function submitRenewalRequest(body: { subscriptionPlan: 'monthly' | 'yearly'; paymentProof: string }) {
  return post<{ storeRequest: SellerStoreRequestPayload }>('/store/subscription/renew', body)
}

// ---- public stores ---------------------------------------------------------

export interface PublicStorePayload {
  _id: string
  name: string
  slug: string
  logo?: string
  description?: string
  descriptionAr?: string
  wilaya?: string
  city?: string
  phone?: string
  sellerName: string
  productCount: number
}

export interface PublicStoreDetailPayload {
  store: PublicStorePayload & { productCount: number }
  categories: SellerCategoryPayload[]
  specialOffers: SellerProductPayload[]
  newProducts: SellerProductPayload[]
  bestSelling: SellerProductPayload[]
  allProducts: SellerPage & { products: SellerProductPayload[] }
}

export function listPublicStores(params?: { page?: number; limit?: number; q?: string; wilaya?: string; city?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  if (params?.wilaya) qs.set('wilaya', params.wilaya)
  if (params?.city) qs.set('city', params.city)
  const q = qs.toString()
  return get<SellerPage & { stores: PublicStorePayload[] }>(`/stores${q ? `?${q}` : ''}`)
}

export function getPublicStore(slug: string, params?: { page?: number; limit?: number; category?: string; sort?: string; q?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.category) qs.set('category', params.category)
  if (params?.sort) qs.set('sort', params.sort)
  if (params?.q) qs.set('q', params.q)
  const q = qs.toString()
  return get<PublicStoreDetailPayload>(`/stores/${slug}${q ? `?${q}` : ''}`)
}

export function getStoreCategories(slug: string) {
  return get<{ categories: SellerCategoryPayload[] }>(`/stores/${slug}/categories`)
}

export function searchCategoriesAcrossStores(q: string) {
  return get<{ categories: { category: SellerCategoryPayload; store: PublicStorePayload; productCount: number }[] }>(`/stores/categories/search?q=${encodeURIComponent(q)}`)
}

export function checkStoreSubscription(slug: string) {
  return get<{ store: { id: string; name: string; slug: string; status: string; subscriptionPlan: string; subscriptionEndDate: string | null; isExpired: boolean; daysRemaining: number; isExpiringSoon: boolean } }>(`/stores/${slug}/subscription`)
}

// ---- referral tracking (public) ------------------------------------------

export function trackReferral(body: { referralCode: string; path?: string; visitorId?: string; productId?: string }) {
  return post<{ referralId: string; expiresAt?: string }>('/marketing/track', body)
}

// ---- admin seller management ---------------------------------------------

export interface AdminSellerRecord {
  _id: string
  fullName: string
  email: string
  phone: string
  status: 'active' | 'suspended'
  createdAt: string
  store: {
    id: string
    name: string
    slug: string
    status: string
    subscriptionPlan: string
    subscriptionEndDate: string
    daysRemaining: number
    isExpired: boolean
  } | null
  stats: {
    totalProducts: number
    totalOrders: number
    deliveredOrders: number
    deliveredRevenue: number
  }
}

export interface AdminStoreRequestRecord {
  _id: string
  seller: string
  sellerName: string
  sellerEmail: string
  sellerPhone: string
  storeName: string
  storeDescription?: string
  storeLogo?: string
  storePhone?: string
  wilaya?: string
  city?: string
  slug: string
  subscriptionPlan: 'monthly' | 'yearly'
  expectedAmount: number
  paymentProof: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  requestDate: string
  reviewedAt?: string
  reviewedBy?: string
  isRenewal: boolean
  store?: string
  createdAt: string
}

export interface AdminStoreRecord {
  _id: string
  seller: { _id: string; fullName: string; email: string; phone: string } | string
  name: string
  slug: string
  description?: string
  logo?: string
  phone?: string
  wilaya?: string
  city?: string
  status: string
  subscriptionPlan?: string
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  createdAt: string
  stats: {
    totalProducts: number
    totalOrders: number
    deliveredOrders: number
    deliveredRevenue: number
  }
}

export function adminListSellers(params?: { page?: number; limit?: number; q?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<Page & { sellers: AdminSellerRecord[] }>(`/admin/seller/sellers${q ? `?${q}` : ''}`)
}

export function adminListStoreRequests(params?: { page?: number; limit?: number; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<Page & { requests: AdminStoreRequestRecord[] }>(`/admin/seller/store-requests${q ? `?${q}` : ''}`)
}

export function adminApproveStoreRequest(id: string) {
  return post<{ store: unknown; request: AdminStoreRequestRecord }>(`/admin/seller/store-requests/${id}/approve`)
}

export function adminRejectStoreRequest(id: string, rejectionReason?: string) {
  return post<{ request: AdminStoreRequestRecord }>(`/admin/seller/store-requests/${id}/reject`, { rejectionReason })
}

export function adminListStores(params?: { page?: number; limit?: number; q?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<Page & { stores: AdminStoreRecord[] }>(`/admin/seller/stores${q ? `?${q}` : ''}`)
}

export function adminSuspendStore(id: string) {
  return post<{ store: AdminStoreRecord }>(`/admin/seller/stores/${id}/suspend`)
}

export function adminActivateStore(id: string) {
  return post<{ store: AdminStoreRecord }>(`/admin/seller/stores/${id}/activate`)
}

export function adminDeleteSeller(id: string) {
  return remove<{ id: string }>(`/admin/seller/sellers/${id}`)
}

// ---- admin ---------------------------------------------------------------

export interface AdminUser {
  _id: string
  name: string
  phone?: string
  email?: string | null
  role: string
  avatar?: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
}

export interface AdminMarketer {
  id: string
  name: string
  phone?: string
  avatar: string | null
  createdAt: string
  profile: {
    _id: string
    user: string
    referralCode: string
    status: string
    publicName: string
    totalEarnings: number
    payoutDetails: { ccp?: string; ccpKey?: string; baridiMob?: string }
  } | null
  stats: MarketerStats | null
}

export function getAdminUsers() {
  return get<Page & { users: AdminUser[] }>('/admin/users')
}

export function deleteAdminUser(id: string) {
  return remove<null>(`/admin/users/${id}`)
}

export function getAdminMarketers() {
  return get<{ marketers: AdminMarketer[] }>('/admin/marketers')
}

export function deleteMarketer(id: string) {
  return remove<null>(`/admin/marketers/${id}`)
}

export function updateMarketerStatus(id: string, status: 'active' | 'suspended') {
  return patch<Record<string, unknown>>(`/admin/marketers/${id}/status`, { status })
}

export function getAdminOrders(params?: { ownerType?: 'BM' | 'SELLER' }) {
  const q = params?.ownerType ? `?ownerType=${params.ownerType}` : ''
  return get<Page & { orders: AdminOrderRecord[] }>(`/admin/orders${q}`)
}

export function updateAdminOrderStatus(id: string, status: string) {
  return patch<{ order: AdminOrderRecord }>(`/admin/orders/${id}/status`, { status })
}

export function deleteAdminOrder(id: string) {
  return remove<null>(`/admin/orders/${id}`)
}

export function getAdminProducts(params?: { page?: number; limit?: number; q?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  if (params?.category) qs.set('category', params.category)
  const q = qs.toString()
  return get<Page & { products: ProductRecord[] }>(`/admin/products${q ? `?${q}` : ''}`)
}

export function createAdminProduct(body: Partial<ProductRecord>) {
  return post<ProductRecord>('/admin/products', body)
}

export function updateAdminProduct(id: string, body: Partial<ProductRecord>) {
  return patch<ProductRecord>(`/admin/products/${id}`, body)
}

export function deleteAdminProduct(id: string) {
  return remove<null>(`/admin/products/${id}`)
}

export function toggleAdminProduct(id: string, body: { isFeatured?: boolean; isSpecialOffer?: boolean }) {
  return patch<ProductRecord>(`/admin/products/${id}/toggle`, body)
}

export function getAdminCategories() {
  return get<CategoryRecord[]>('/admin/categories')
}

export function createCategory(body: Partial<CategoryRecord>) {
  return post<CategoryRecord>('/admin/categories', body)
}

export function updateCategory(id: string, body: Partial<CategoryRecord>) {
  return patch<CategoryRecord>(`/admin/categories/${id}`, body)
}

export function deleteCategory(id: string) {
  return remove<null>(`/admin/categories/${id}`)
}

export interface RewardCategoryRecord {
  _id: string
  slug: string
  name: string
  nameAr?: string
  nameFr?: string
  rewardEnabled: boolean
  rewardNormalPercent: number
  rewardSpecialPercent: number
  active: boolean
}

export interface AdminRewards {
  settings: { rewardSystemEnabled: boolean }
  categories: RewardCategoryRecord[]
}

export interface PublicRewards {
  enabled: boolean
  categories: Pick<
    RewardCategoryRecord,
    'slug' | 'name' | 'nameAr' | 'nameFr' | 'rewardNormalPercent' | 'rewardSpecialPercent'
  >[]
}

export function getAdminRewards() {
  return get<AdminRewards>('/admin/rewards')
}

export function updateRewardSettings(body: { rewardSystemEnabled: boolean }) {
  return patch<AdminRewards>('/admin/rewards/settings', body)
}

export function updateCategoryReward(
  id: string,
  body: {
    rewardEnabled?: boolean
    rewardNormalPercent?: number
    rewardSpecialPercent?: number
  },
) {
  return patch<AdminRewards>(`/admin/rewards/categories/${id}`, body)
}

export interface AdminWilayas {
  wilayas: WilayaRecord[]
  defaultPrice: number
}

export function getAdminWilayas() {
  return get<AdminWilayas>('/admin/wilayas')
}

export function updateWilaya(code: string, body: { deliveryPrice?: number; isActive?: boolean }) {
  return patch<WilayaRecord>(`/admin/wilayas/${code}`, body)
}

export function getPublicRewards() {
  return get<PublicRewards>('/rewards')
}

export interface BannerAdminList {
  banners: BannerRecord[]
  activeCount: number
  max: number
}

export function getAdminBanners() {
  return get<BannerAdminList>('/admin/banners')
}

export function createBanner(body: Partial<BannerRecord>) {
  return post<BannerRecord>('/admin/banners', body)
}

export function updateBanner(id: string, body: Partial<BannerRecord>) {
  return patch<BannerRecord>(`/admin/banners/${id}`, body)
}

export function deleteBanner(id: string) {
  return remove<null>(`/admin/banners/${id}`)
}

// ---- posts (admin) --------------------------------------------------------

export interface PostRecord {
  _id: string
  textEn?: string
  textAr?: string
  mediaType: 'images' | 'video'
  images: string[]
  video?: string | null
  productId: {
    _id: string
    name: string
    nameAr?: string
    slug: string
    image: string
    price: number
    oldPrice?: number
    isSpecialOffer?: boolean
    discount?: number
  } | null
  status: 'draft' | 'published'
  likesCount?: number
  commentsCount?: number
  userLiked?: boolean
  createdAt: string
  updatedAt: string
}

export interface CommentAuthor {
  _id: string
  name: string
  avatar?: string | null
}

export interface CommentRecord {
  _id: string
  postId: string
  text: string
  createdAt: string
  updatedAt: string
  authorId: string
  author: CommentAuthor | null
}

export interface LikeResult {
  liked: boolean
  likesCount: number
}

export interface CreatePostInput {
  textEn?: string
  textAr?: string
  mediaType: 'images' | 'video'
  images?: string[]
  video?: string
  productId?: string
  status?: 'draft' | 'published'
}

export function getAdminPosts() {
  return get<{ posts: PostRecord[] }>('/admin/posts')
}

export function createPost(body: CreatePostInput) {
  return post<PostRecord>('/admin/posts', body)
}

export function updatePost(id: string, body: Partial<CreatePostInput>) {
  return patch<PostRecord>(`/admin/posts/${id}`, body)
}

export function deletePost(id: string) {
  return remove<null>(`/admin/posts/${id}`)
}

export function publishPost(id: string) {
  return patch<PostRecord>(`/admin/posts/${id}/publish`)
}

export async function uploadVideo(file: File): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('video', file)
  const res = await api.post<ApiResponse<{ url: string }>>('/admin/upload/video', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const url = res.data?.data?.url ?? ''
  if (!url) throw new Error('Upload failed')
  if (url.startsWith('http')) return { url }
  const origin = (() => {
    try {
      return new URL(api.defaults.baseURL ?? '', window.location.origin).origin
    } catch {
      return window.location.origin
    }
  })()
  return { url: `${origin}${url.startsWith('/') ? url : `/${url}`}` }
}

// ---- posts (public) -------------------------------------------------------

export function getPublishedPosts(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return get<{ posts: PostRecord[]; page: number; total: number; pages: number }>(`/posts${q ? `?${q}` : ''}`)
}

export function getPublishedPostsHome() {
  return get<PostRecord[]>('/posts/home')
}

export function likePost(id: string) {
  return post<LikeResult>(`/posts/${id}/like`)
}

export function unlikePost(id: string) {
  return remove<LikeResult>(`/posts/${id}/like`)
}

export function getComments(postId: string, params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return get<{ comments: CommentRecord[]; page: number; total: number; pages: number }>(
    `/posts/${postId}/comments${q ? `?${q}` : ''}`
  )
}

export function createComment(postId: string, text: string) {
  return post<CommentRecord>(`/posts/${postId}/comments`, { text })
}

export function updateComment(commentId: string, text: string) {
  return put<CommentRecord>(`/comments/${commentId}`, { text })
}

export function deleteComment(commentId: string) {
  return remove<null>(`/comments/${commentId}`)
}

export function recordPayout(body: { marketerId: string; amount: number; method: 'CCP' | 'BaridiMob'; notes?: string }) {
  return post<MarketerPayoutRecord>('/admin/payouts', body)
}

export function getPayouts(params?: { marketer?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.marketer) qs.set('marketer', params.marketer)
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return get<{ payouts: (MarketerPayoutRecord & { marketer?: { _id: string; name: string; phone?: string } })[] }>(
    `/admin/payouts${q ? `?${q}` : ''}`
  )
}

export function updatePayout(id: string, action: 'cancel') {
  return patch<MarketerPayoutRecord>(`/admin/payouts/${id}`, { action })
}

// ---- orders (admin) ------------------------------------------------------

export interface AdminOrderRecord {
  _id: string
  orderRef: string
  customerOrderNumber?: number
  discountPercent?: number
  discountAmount?: number
  /** Legacy per-product reward discount (pre-discount-system orders only). */
  rewardDiscount?: number
  items: { productId: string; name: string; qty: number; price: number; image?: string }[]
  customer: {
    fullName: string
    phone: string
    wilaya: string
    wilayaName?: string
    commune: string
    address: string
    note?: string
  }
  subtotal: number
  delivery: number
  total: number
  status: string
  createdAt: string
  referralAttributed?: boolean
  referralCode?: string
  commissionAmount?: number
  marketer?: { _id: string; name: string; phone?: string } | null
}

export default api
