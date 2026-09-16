export interface Product {
  id: string
  _id?: string
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
  ownerType?: 'BM_STORE' | 'SELLER'
  store?: string
  seller?: string
  status?: 'active' | 'paused_by_seller' | 'disabled_by_admin'
}

export interface Category {
  id: string
  slug: string
  name: string
  nameAr?: string
  nameFr?: string
  image: string
  productCount: number
  icon:
    | 'spices'
    | 'cosmetics'
    | 'baking'
    | 'nuts'
    | 'legumes'
    | 'natural'
    | 'dried'
    | 'oilsHoney'
  rewardEnabled?: boolean
  rewardNormalPercent?: number
  rewardSpecialPercent?: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'rejected' | 'cancelled'

export interface OrderItem {
  productId: string
  name: string
  qty: number
  price: number
  image?: string
  category?: string
  discountPercent?: number
  discountAmount?: number
  isRewardMilestone?: boolean
}

export interface OrderDelivery {
  fullName: string
  phone: string
  wilaya: string
  wilayaName?: string
  commune: string
  address: string
  note?: string
}

export interface Order {
  _id?: string
  id: string
  items: OrderItem[]
  customer: OrderDelivery
  subtotal: number
  delivery: number
  customerOrderNumber?: number
  discountPercent?: number
  discountAmount?: number
  total: number
  status: OrderStatus
  createdAt: string
}

export interface MarketerProfile {
  id: string
  publicName: string
  bio?: string
  avatar?: string
  referralCode: string
  referralLink: string
  status: string
  payoutDetails: {
    ccp?: string
    baridiMob?: string
  }
  totalEarnings: number
  createdAt: string
}

export interface PostProduct {
  name: string
  nameAr?: string
  slug: string
  image: string
  price: number
  oldPrice?: number
  isSpecialOffer?: boolean
  discount?: number
}

export interface Post {
  _id: string
  textEn?: string
  textAr?: string
  mediaType: 'images' | 'video'
  images: string[]
  video?: string | null
  productId: PostProduct
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}
