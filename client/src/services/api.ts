import axios from 'axios'
import type { ApiResponse } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const url = original?.url ?? ''
    const isAuth = ['/auth/login', '/auth/register', '/auth/register-marketer', '/auth/refresh'].some((p) => url.includes(p))
    if (err.response?.status === 401 && original && !original._retry && !isAuth) {
      original._retry = true
      try {
        await api.post('/auth/refresh')
        return api(original)
      } catch {
        /* refresh failed — session truly expired */
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
  role: 'USER' | 'MARKETER' | 'ADMIN'
  avatar: string | null
  phone: string | null
  createdAt: string
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
  return get<AuthPayload>('/auth/me')
}

export function updateMe(body: { name?: string; phone?: string; avatar?: string }) {
  return patch<AuthPayload>('/auth/me', body)
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return patch<null>('/auth/password', body)
}

export function login(phone: string, password: string) {
  return post<AuthPayload>('/auth/login', { phone, password })
}

export function register(name: string, phone: string, password: string, opts?: { referralId?: string }) {
  return post<AuthPayload>('/auth/register', { name, phone, password, referralId: opts?.referralId })
}

export interface RegisterMarketerInput {
  name: string
  phone: string
  password: string
  bio?: string
  avatar?: string
  baridiMob?: string
  ccp?: string
  ccpKey?: string
}

export function registerMarketer(body: RegisterMarketerInput) {
  return post<BecomeMarketerPayload>('/auth/register-marketer', body)
}

export function logout() {
  return post<null>('/auth/logout')
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
  return post<BecomeMarketerPayload>('/auth/become-marketer')
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
  stock: number
  lowStockThreshold: number
  isActive: boolean
  isFeatured: boolean
  isSpecialOffer?: boolean
  confirmedSales?: number
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
  inStock?: boolean
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
  if (params?.inStock !== undefined) qs.set('inStock', String(params.inStock))
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
  /** Stable idempotency key for one checkout attempt (retries reuse it). */
  clientKey?: string
  customer: {
    fullName: string
    phone: string
    wilaya: string
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
  /** Customer's personal order number (1, 2, ...). Absent on legacy orders. */
  customerOrderNumber?: number
  /** Loyalty discount percent applied (5 normal, 7 every 10th). */
  discountPercent?: number
  /** Loyalty discount amount in DZD. */
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
}

export function getMyOrders() {
  return get<{ orders: MyOrderRecord[]; nextCustomerOrderNumber: number; nextDiscountPercent: number }>('/orders/me')
}

export function updateMyOrder(
  id: string,
  body: {
    items?: { productId: string; qty: number }[]
    customer?: { wilaya?: string; wilayaName?: string; commune?: string; address?: string; note?: string }
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
    bio?: string
    avatar?: string
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
  bio?: string
  avatar?: string
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

// ---- referral tracking (public) ------------------------------------------

export function trackReferral(body: { referralCode: string; path?: string; visitorId?: string; productId?: string }) {
  return post<{ referralId: string; expiresAt?: string }>('/marketing/track', body)
}

// ---- admin ---------------------------------------------------------------

export interface AdminUser {
  _id: string
  name: string
  phone?: string
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

export function getAdminMarketerDetail(id: string) {
  return get<{
    profile: MarketerProfilePayload['profile']
    stats: MarketerStats
    commissionsCount: number
    payouts: MarketerPayoutRecord[]
    referralLink: string
  }>(`/admin/marketers/${id}`)
}

export function getAdminMarketerOrders(id: string) {
  return get<Page & { orders: MarketerOrderRecord[] }>(`/admin/marketers/${id}/orders`)
}

export function getAdminMarketerCommissions(id: string) {
  return get<{ commissions: CommissionRecord[] }>(`/admin/marketers/${id}/commissions`)
}

export function getAdminMarketerReferrals(id: string) {
  return get<{
    referrals: {
      _id: string
      referralCode: string
      landingPath: string
      created: boolean
      converted: boolean
      convertedAt?: string | null
      customer?: { _id: string; name: string } | null
      createdAt: string
    }[]
  }>(`/admin/marketers/${id}/referrals`)
}

export function getAdminMarketerPayouts(id: string) {
  return get<{ payouts: MarketerPayoutRecord[] }>(`/admin/marketers/${id}/payouts`)
}

export function deleteMarketer(id: string) {
  return remove<null>(`/admin/marketers/${id}`)
}

export function updateMarketerStatus(id: string, status: 'active' | 'suspended') {
  return patch<Record<string, unknown>>(`/admin/marketers/${id}/status`, { status })
}

export function getAdminOrders() {
  return get<Page & { orders: AdminOrderRecord[] }>('/admin/orders')
}

export function updateAdminOrderStatus(id: string, status: string) {
  return patch<{ order: AdminOrderRecord }>(`/admin/orders/${id}/status`, { status })
}

export function getAdminProducts(params?: { page?: number; limit?: number; q?: string; category?: string; isActive?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.q) qs.set('q', params.q)
  if (params?.category) qs.set('category', params.category)
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive))
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

export function toggleAdminProduct(id: string, body: { isActive?: boolean; isFeatured?: boolean; isSpecialOffer?: boolean }) {
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
  }
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
  productId: string
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

export function recordPayout(body: { marketerId: string; amount: number; method: 'CCP' | 'BaridiMob'; reference?: string; notes?: string }) {
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
