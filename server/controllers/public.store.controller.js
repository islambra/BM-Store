import mongoose from 'mongoose'
import Store from '../models/Store.js'
import Seller from '../models/Seller.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Order from '../models/Order.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The BM Store is the platform's own storefront: its products live in the main
// catalog (ownerType: 'BM_STORE') without a Store document. The admin does NOT
// have a store like other sellers, so it is never listed in the public stores
// directory; its catalog is still served as a deep link under slug "bm-store".
const BM_STORE = {
  _id: 'bm-store',
  name: 'BM Store',
  nameAr: 'بي إم ستور',
  slug: 'bm-store',
  logo: null,
  description: null,
  wilaya: null,
  city: null,
  phone: null,
  subscriptionPlan: null,
  status: 'active',
  sellerName: 'BM Store',
}

async function getBmStoreEntry() {
  const productCount = await Product.countDocuments({ ownerType: 'BM_STORE', isActive: true, status: 'active' })
  return { ...BM_STORE, productCount }
}

// Public stores listing
export const listPublicStores = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const { q, wilaya, city } = req.query

  const query = { status: 'active' }
  if (q && typeof q === 'string' && q.trim()) {
    const safe = escapeRegex(q.trim())
    const sellerIds = await Seller.find({ fullName: { $regex: safe, $options: 'i' }, status: 'active' })
      .select('_id')
      .lean()
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { seller: { $in: sellerIds.map((s) => s._id) } },
    ]
  }
  if (wilaya) query.wilaya = wilaya
  if (city) query.city = city

  // Check subscription expiration
  const now = new Date()
  query.$and = [
    {
      $or: [
        { subscriptionEndDate: { $exists: false } },
        { subscriptionEndDate: null },
        { subscriptionEndDate: { $gt: now } },
      ],
    },
  ]

  const [stores, total] = await Promise.all([
    Store.find(query)
      .populate('seller', 'fullName')
      .select('name slug logo description wilaya city phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Store.countDocuments(query),
  ])

  // Get product counts
  const storeIds = stores.map((s) => s._id)
  const productCounts = await Product.aggregate([
    { $match: { store: { $in: storeIds }, isActive: true, status: 'active' } },
    { $group: { _id: '$store', count: { $sum: 1 } } },
  ])
  const countByStore = Object.fromEntries(productCounts.map((c) => [String(c._id), c.count]))

  const withCounts = stores.map((store) => ({
    ...store,
    sellerName: store.seller?.fullName || '',
    productCount: countByStore[String(store._id)] || 0,
  }))

  return sendSuccess(res, { stores: withCounts, page, limit, total, pages: Math.ceil(total / limit) })
})

// Public store by slug
export const getPublicStore = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const now = new Date()

  const slugLc = (slug || '').toLowerCase()

  // The BM Store is virtual — no Store document. Serve the main catalog.
  if (slugLc === BM_STORE.slug) {
    const bm = await getBmStoreEntry()
    if (bm.productCount === 0) return sendError(res, 'Store not found', 404)

    const productQuery = { ownerType: 'BM_STORE', isActive: true, status: 'active' }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const { category: catSlug, sort } = req.query

    const [categories, specialOffers, newProducts, bestSelling] = await Promise.all([
      Category.find({ active: true, store: null }).sort({ order: 1, name: 1 }).lean(),
      Product.find({ ...productQuery, isSpecialOffer: true }).sort({ createdAt: -1 }).limit(10).lean(),
      Product.find(productQuery).sort({ createdAt: -1 }).limit(10).lean(),
      Product.find(productQuery).sort({ confirmedSales: -1, createdAt: -1 }).limit(10).lean(),
    ])

    // Category product counts
    const catSlugs = categories.map((c) => c.slug)
    const catCounts = await Product.aggregate([
      { $match: { ...productQuery, category: { $in: catSlugs } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    const countByCat = Object.fromEntries(catCounts.map((c) => [c._id, c.count]))
    const withCounts = categories.map((c) => ({ ...c, productCount: countByCat[c.slug] || 0 }))

    const allQuery = { ...productQuery }
    if (catSlug) allQuery.category = catSlug
    if (req.query.q) {
      const safe = escapeRegex(req.query.q.trim())
      allQuery.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { nameAr: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { descriptionAr: { $regex: safe, $options: 'i' } },
      ]
    }

    const sortMap = {
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      newest: { createdAt: -1 },
      popular: { confirmedSales: -1, createdAt: -1 },
    }

    const [allProducts, allTotal] = await Promise.all([
      Product.find(allQuery)
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(allQuery),
    ])

    return sendSuccess(res, {
      store: { ...bm, sellerName: 'BM Store', productCount: bm.productCount },
      categories: withCounts,
      specialOffers,
      newProducts,
      bestSelling,
      allProducts: {
        products: allProducts,
        page,
        limit,
        total: allTotal,
        pages: Math.ceil(allTotal / limit),
      },
    })
  }

  const store = await Store.findOne({
    slug: slugLc,
    status: 'active',
    $or: [
      { subscriptionEndDate: { $exists: false } },
      { subscriptionEndDate: null },
      { subscriptionEndDate: { $gt: now } },
    ],
  })
    .populate('seller', 'fullName')
    .lean()

  if (!store) return sendError(res, 'Store not found', 404)

  // Get store categories
  const categories = await Category.find({ store: store._id, active: true }).sort({ order: 1 }).lean()

  // Get products
  const productQuery = { store: store._id, isActive: true, status: 'active' }

  // Special offers
  const specialOffers = await Product.find({ ...productQuery, isSpecialOffer: true })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  // New products
  const newProducts = await Product.find(productQuery)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  // Best selling
  const bestSelling = await Product.find(productQuery)
    .sort({ confirmedSales: -1, createdAt: -1 })
    .limit(10)
    .lean()

  // All products with pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const { category: catSlug, sort } = req.query

  const allQuery = { ...productQuery }
  if (catSlug) allQuery.category = catSlug
  if (req.query.q) {
    const safe = escapeRegex(req.query.q.trim())
    allQuery.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { descriptionAr: { $regex: safe, $options: 'i' } },
    ]
  }

  const sortMap = {
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    newest: { createdAt: -1 },
    popular: { confirmedSales: -1, createdAt: -1 },
  }

  const [allProducts, allTotal] = await Promise.all([
    Product.find(allQuery)
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(allQuery),
  ])

  // Total product count
  const totalProducts = await Product.countDocuments(productQuery)

  return sendSuccess(res, {
    store: {
      ...store,
      sellerName: store.seller?.fullName || '',
      productCount: totalProducts,
    },
    categories,
    specialOffers,
    newProducts,
    bestSelling,
    allProducts: {
      products: allProducts,
      page,
      limit,
      total: allTotal,
      pages: Math.ceil(allTotal / limit),
    },
  })
})

// Public store categories search across stores
export const searchCategoriesAcrossStores = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q || typeof q !== 'string' || !q.trim()) {
    return sendError(res, 'Search query is required', 400)
  }

  const safe = escapeRegex(q.trim())
  const now = new Date()

  // Find active stores with valid subscriptions
  const activeStores = await Store.find({
    status: 'active',
    $or: [
      { subscriptionEndDate: { $exists: false } },
      { subscriptionEndDate: null },
      { subscriptionEndDate: { $gt: now } },
    ],
  })
    .populate('seller', 'fullName')
    .select('_id name slug wilaya city')
    .lean()

  const storeIds = activeStores.map((s) => s._id)
  const storeById = Object.fromEntries(activeStores.map((s) => [String(s._id), s]))

  // Search categories in these stores
  const categories = await Category.find({
    store: { $in: storeIds },
    active: true,
    $or: [
      { name: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
    ],
  }).sort({ order: 1 }).limit(50).lean()

  // Get product counts per category per store
  const categoryStoreKeys = categories.map((c) => `${c.store}-${c.slug}`)
  const productCounts = await Product.aggregate([
    { $match: { store: { $in: storeIds }, isActive: true, status: 'active' } },
    { $group: { _id: { store: '$store', category: '$category' }, count: { $sum: 1 } } },
  ])
  const countByCategoryStore = Object.fromEntries(
    productCounts.map((c) => [`${c._id.store}-${c._id.category}`, c.count])
  )

  const results = categories.map((cat) => {
    const store = storeById[String(cat.store)]
    return {
      category: {
        id: cat._id,
        slug: cat.slug,
        name: cat.name,
        nameAr: cat.nameAr,
      },
      store: store ? {
        id: store._id,
        name: store.name,
        slug: store.slug,
        sellerName: store.seller?.fullName || '',
        wilaya: store.wilaya,
        city: store.city,
      } : null,
      productCount: countByCategoryStore[`${cat.store}-${cat.slug}`] || 0,
    }
  })

  return sendSuccess(res, { categories: results })
})

// Public store categories
export const getStoreCategories = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const now = new Date()

  const store = await Store.findOne({
    slug: slug.toLowerCase(),
    status: 'active',
    $or: [
      { subscriptionEndDate: { $exists: false } },
      { subscriptionEndDate: null },
      { subscriptionEndDate: { $gt: now } },
    ],
  }).lean()

  if (!store) return sendError(res, 'Store not found', 404)

  const categories = await Category.find({ store: store._id, active: true }).sort({ order: 1 }).lean()

  // Get product counts
  const categorySlugs = categories.map((c) => c.slug)
  const productCounts = await Product.aggregate([
    { $match: { store: store._id, category: { $in: categorySlugs }, isActive: true, status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ])
  const countByCategory = Object.fromEntries(productCounts.map((c) => [c._id, c.count]))

  const withCounts = categories.map((cat) => ({
    ...cat,
    productCount: countByCategory[cat.slug] || 0,
  }))

  return sendSuccess(res, { categories: withCounts })
})

// Check subscription status for store (used by frontend)
export const checkStoreSubscription = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const now = new Date()

  const store = await Store.findOne({ slug: slug.toLowerCase() }).lean()
  if (!store) return sendError(res, 'Store not found', 404)

  const endDate = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null
  const isExpired = endDate && endDate <= now
  const daysRemaining = endDate && endDate > now ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0

  return sendSuccess(res, {
    store: {
      id: store._id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      subscriptionPlan: store.subscriptionPlan,
      subscriptionEndDate: store.subscriptionEndDate,
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
    },
  })
})