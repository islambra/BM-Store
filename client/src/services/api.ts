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
  email: string
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

export function updateMe(body: { name?: string; email?: string; phone?: string; avatar?: string }) {
  return patch<AuthPayload>('/auth/me', body)
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return patch<null>('/auth/password', body)
}

export function login(phone: string, password: string) {
  return post<AuthPayload>('/auth/login', { phone, password })
}

export function register(name: string, phone: string, password: string) {
  return post<AuthPayload>('/auth/register', { name, phone, password })
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
  isRewardEligible: boolean
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

export function getMyOrders() {
  return get<{ orders: Record<string, unknown>[] }>('/orders/me')
}

// ---- marketer ------------------------------------------------------------

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
  }
  stats: {
    visits: number
    attributedOrders: number
    commission: { pending: number; approved: number; paid: number; cancelled: number; total: number }
  }
  baseUrl: string
}

export function getMarketerMe() {
  return get<MarketerProfilePayload>('/marketer/me')
}

export function updateMarketerMe(body: {
  publicName?: string
  bio?: string
  avatar?: string
  payoutDetails?: { ccp?: string; ccpKey?: string; baridiMob?: string }
}) {
  return patch<unknown>('/marketer/me', body)
}

export function getMarketerEarnings() {
  return get<{ commissions: Record<string, unknown>[] }>('/marketer/earnings')
}

// ---- referral tracking (public) ------------------------------------------

export function trackReferral(body: { referralCode: string; path?: string }) {
  return post<{ referralId: string }>('/marketing/track', body)
}

// ---- admin ---------------------------------------------------------------

export interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  avatar?: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
}

export interface AdminMarketer {
  id: string
  name: string
  email: string
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
  stats: {
    visits: number
    commission: { pending?: number; approved?: number; paid?: number; cancelled?: number }
  }
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

export function toggleAdminProduct(id: string, body: { isActive?: boolean; isFeatured?: boolean; isSpecialOffer?: boolean; isRewardEligible?: boolean }) {
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

export function recordPayout(body: { marketerId: string; amount: number; period: string; method: 'CCP' | 'BaridiMob'; reference?: string }) {
  return post<Record<string, unknown>>('/admin/payouts', body)
}

export function getPayouts() {
  return get<{ payouts: Record<string, unknown>[] }>('/admin/payouts')
}

// ---- orders (admin) ------------------------------------------------------

export interface AdminOrderRecord {
  _id: string
  orderRef: string
  items: { productId: string; name: string; qty: number; price: number }[]
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
  rewardDiscount?: number
  total: number
  status: string
  createdAt: string
}

export default api
