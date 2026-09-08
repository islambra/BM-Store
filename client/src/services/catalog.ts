import axios from 'axios'
import type { Category, Product } from '../types'
import {
  getBanners,
  getCategories as apiGetCategories,
  getProductById,
  getProductBySlug,
  listProducts,
  type BannerRecord,
  type CategoryRecord,
  type ProductRecord,
} from './api'

const VALID_ICONS = ['spices', 'cosmetics', 'baking', 'nuts', 'legumes', 'natural', 'dried', 'oilsHoney'] as const

export function toCategory(r: CategoryRecord): Category {
  return {
    id: r._id,
    slug: r.slug,
    name: r.name,
    nameAr: r.nameAr,
    nameFr: r.nameFr,
    image: r.image,
    productCount: r.productCount ?? 0,
    icon: (VALID_ICONS as readonly string[]).includes(r.icon) ? (r.icon as Category['icon']) : 'spices',
  }
}

export function toProduct(r: ProductRecord): Product {
  return {
    id: r._id,
    name: r.name,
    nameAr: r.nameAr,
    nameFr: r.nameFr,
    description: r.description ?? '',
    descriptionAr: r.descriptionAr,
    descriptionFr: r.descriptionFr,
    price: r.price,
    oldPrice: r.oldPrice,
    image: r.image,
    images: r.images && r.images.length > 0 ? r.images : [r.image].filter(Boolean),
    thumbnail: r.thumbnail ?? r.image,
    category: r.category,
    categoryName: r.categoryName ?? r.category,
    discount: r.discount ?? 0,
    tags: r.tags,
    stock: r.stock ?? 0,
    lowStockThreshold: r.lowStockThreshold ?? 5,
    isActive: r.isActive ?? true,
    isFeatured: r.isFeatured ?? false,
    isSpecialOffer: r.isSpecialOffer ?? false,
    isRewardEligible: r.isRewardEligible ?? false,
    confirmedSales: r.confirmedSales ?? 0,
  }
}

export interface Banner {
  id: string
  image: string
  link: string | null
}

export function toBanner(r: BannerRecord): Banner {
  return { id: r._id, image: r.image, link: r.link || null }
}

export async function loadCategories(): Promise<Category[]> {
  const records = await apiGetCategories()
  return records.map(toCategory)
}

export async function loadBanners(): Promise<Banner[]> {
  const records = await getBanners()
  return records.map(toBanner)
}

export interface CatalogPage {
  products: Product[]
  total: number
  page: number
  pages: number
}

export interface CatalogQuery {
  category?: string
  q?: string
  sort?: string
  page?: number
  limit?: number
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  offer?: boolean
}

export async function loadProductsPage(query: CatalogQuery = {}): Promise<CatalogPage> {
  const page = await listProducts({
    category: query.category,
    q: query.q,
    sort: query.sort,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock,
    offer: query.offer,
  })
  return {
    products: page.products.map(toProduct),
    total: page.total,
    page: page.page,
    pages: page.pages,
  }
}

export async function loadOffers(limit = 4): Promise<Product[]> {
  const page = await listProducts({ offer: true, sort: 'popular', limit })
  return page.products.map(toProduct)
}

export async function loadBestSellers(limit = 8): Promise<Product[]> {
  const page = await listProducts({ sort: 'best-selling', limit })
  return page.products.map(toProduct)
}

export async function loadProductById(id: string): Promise<Product> {
  return toProduct(await getProductById(id))
}

export async function loadProductBySlug(slug: string): Promise<Product> {
  return toProduct(await getProductBySlug(slug))
}

export async function loadProduct(idOrSlug: string): Promise<Product> {
  try {
    return await loadProductById(idOrSlug)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return await loadProductBySlug(idOrSlug)
    }
    throw err
  }
}

/* Small in-memory cache so wishlist rows and related sections do not refetch. */
const productCache = new Map<string, Promise<Product>>()

export function cachedProductFetcher(id: string) {
  if (!productCache.has(id)) {
    const promise = loadProduct(id).catch((err) => {
      productCache.delete(id)
      throw err
    })
    productCache.set(id, promise)
  }
  return productCache.get(id) as Promise<Product>
}

export async function loadProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = Array.from(new Set(ids))
  const settled = await Promise.allSettled(unique.map((id) => cachedProductFetcher(id)))
  return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
}