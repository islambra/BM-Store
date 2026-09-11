import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

const sortMap = {
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
  popular: { confirmedSales: -1, createdAt: 1 },
  'best-selling': { confirmedSales: -1, createdAt: 1 },
  newest: { createdAt: -1 },
  featured: { isFeatured: -1, createdAt: -1 },
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const discountOf = (price, oldPrice) =>
  Number(oldPrice) > Number(price) && Number(price) > 0 ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100) : 0

// Discounts are reserved for products explicitly marked as special offers.
const toPublic = (doc) => {
  const isOffer = Boolean(doc.isSpecialOffer)
  const price = Number(doc.price) || 0
  const oldPrice = Number(doc.oldPrice) || 0
  const out = { ...doc, discount: isOffer ? discountOf(price, oldPrice) : 0 }
  delete out.rating
  delete out.reviewCount
  if (!isOffer) out.oldPrice = undefined
  return out
}

export const getProducts = asyncHandler(async (req, res) => {
  const { category, q, sort, minPrice, maxPrice, inStock, featured, offer } = req.query
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))

  const query = { isActive: true }
  if (category) query.category = category
  if (featured === 'true') query.isFeatured = true
  if (offer === 'true') query.isSpecialOffer = true
  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = Number(minPrice)
    if (maxPrice) query.price.$lte = Number(maxPrice)
  }
  if (inStock === 'true') query.stock = { $gt: 0 }
  if (q && typeof q === 'string' && q.trim()) {
    const safe = escapeRegex(q.trim())
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { nameFr: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { descriptionFr: { $regex: safe, $options: 'i' } },
      { descriptionAr: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ]
  }

  const [docs, total] = await Promise.all([
    Product.find(query)
      .sort(sortMap[sort] ?? { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ])

  return sendSuccess(res, { products: docs.map(toPublic), page, limit, total, pages: Math.ceil(total / limit) })
})

const safeId = (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 'Product not found', 404)
    return null
  }
  return id
}

export const getProductById = asyncHandler(async (req, res) => {
  const id = safeId(req.params.id, res)
  if (!id) return
  const doc = await Product.findById(id).lean()
  if (!doc) return sendError(res, 'Product not found', 404)
  return sendSuccess(res, toPublic(doc))
})

export const getProductBySlug = asyncHandler(async (req, res) => {
  const doc = await Product.findOne({ slug: req.params.slug, isActive: true }).lean()
  if (!doc) return sendError(res, 'Product not found', 404)
  return sendSuccess(res, toPublic(doc))
})

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'product'

async function uniqueSlug(name, exceptId) {
  const base = slugify(name)
  if (!exceptId && !(await Product.exists({ slug: base }))) return base
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`
    const exists = await Product.exists({ slug: candidate, _id: { $ne: exceptId } })
    if (!exists) return candidate
  }
  return `${base}-${Date.now()}`
}

const pickProductFields = (body, current = null) => {
  const out = {}
  const fields = [
    'name', 'nameAr', 'nameFr', 'description', 'descriptionAr', 'descriptionFr',
    'image', 'thumbnail', 'category', 'categoryName',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  if (body.images !== undefined) out.images = Array.isArray(body.images) ? body.images.slice(0, 5) : []
  if (body.tags !== undefined) out.tags = body.tags
  if (body.stock !== undefined) out.stock = Math.max(0, Number(body.stock))
  if (body.lowStockThreshold !== undefined) out.lowStockThreshold = Math.max(0, Number(body.lowStockThreshold))
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive)
  if (body.isFeatured !== undefined) out.isFeatured = Boolean(body.isFeatured)
  if (body.price !== undefined) out.price = Number(body.price)
  if (body.isSpecialOffer !== undefined) out.isSpecialOffer = Boolean(body.isSpecialOffer)

  const isOffer = out.isSpecialOffer ?? current?.isSpecialOffer ?? false
  if (body.oldPrice !== undefined) {
    // Only special offers may store an old price; normal products never do.
    if (isOffer) out.oldPrice = Number(body.oldPrice) > 0 ? Number(body.oldPrice) : undefined
    else out.oldPrice = null // null acts as a "remove this field" marker
  } else if (!isOffer && current?.oldPrice) {
    // Product switched (or is) normal: drop any previously stored old price.
    out.oldPrice = null
  }
  // The stored discount is decorative; the public discount is always recomputed server-side.
  out.discount = 0
  return out
}

const validateOffer = (body, current) => {
  const price = body.price !== undefined ? Number(body.price) : current?.price
  const oldPrice = body.oldPrice !== undefined ? Number(body.oldPrice) : current?.oldPrice
  const isOffer = body.isSpecialOffer !== undefined ? Boolean(body.isSpecialOffer) : current?.isSpecialOffer ?? false
  if (isOffer) {
    if (!(Number(oldPrice) > Number(price) && Number(price) > 0)) {
      return 'Special offers require an old price higher than the sale price'
    }
  }
  return null
}

// ---- Admin product CRUD ----

export const adminListProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.isActive === 'true') query.isActive = true
  if (req.query.isActive === 'false') query.isActive = false
  if (req.query.isFeatured === 'true') query.isFeatured = true
  if (req.query.category) query.category = req.query.category
  if (req.query.q) {
    const safe = escapeRegex(req.query.q.trim())
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
      { nameFr: { $regex: safe, $options: 'i' } },
    ]
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(query),
  ])
  return sendSuccess(res, { products, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  if (!String(body.name ?? '').trim() || !Number.isFinite(Number(body.price)) || !String(body.category ?? '').trim()) {
    return sendError(res, 'Name, price and category are required', 400)
  }

  const invalidOffer = validateOffer(body)
  if (invalidOffer) return sendError(res, invalidOffer, 400)

  const data = pickProductFields(body)
  if (data.oldPrice === undefined || data.oldPrice === null) delete data.oldPrice
  if (data.stock === undefined) data.stock = 100
  data.slug = await uniqueSlug(data.name)
  const product = await Product.create(data)
  return sendSuccess(res, product, 'Product created', 201)
})

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const id = safeId(req.params.id, res)
  if (!id) return

  const product = await Product.findById(id)
  if (!product) return sendError(res, 'Product not found', 404)

  const invalidOffer = validateOffer(req.body ?? {}, product)
  if (invalidOffer) return sendError(res, invalidOffer, 400)

  const data = pickProductFields(req.body ?? {}, product)
  const unsetOldPrice = data.oldPrice === null
  if (unsetOldPrice) {
    await Product.updateOne({ _id: product._id }, { $unset: { oldPrice: '' } })
    product.oldPrice = undefined
  }
  if (unsetOldPrice || data.oldPrice === undefined) delete data.oldPrice
  if (data.name && req.body.name !== product.name) {
    data.slug = await uniqueSlug(data.name, product._id)
  }
  Object.assign(product, data)
  const updated = await product.save()
  return sendSuccess(res, updated, 'Product updated')
})

export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const id = safeId(req.params.id, res)
  if (!id) return

  const product = await Product.findByIdAndDelete(id)
  if (!product) return sendError(res, 'Product not found', 404)
  return sendSuccess(res, null, 'Product deleted')
})

export const adminToggleProduct = asyncHandler(async (req, res) => {
  const id = safeId(req.params.id, res)
  if (!id) return

  const product = await Product.findById(id)
  if (!product) return sendError(res, 'Product not found', 404)

  if (req.body.isActive !== undefined) product.isActive = Boolean(req.body.isActive)
  if (req.body.isFeatured !== undefined) product.isFeatured = Boolean(req.body.isFeatured)
  if (req.body.isSpecialOffer !== undefined) {
    const wantOffer = Boolean(req.body.isSpecialOffer)
    if (wantOffer) {
      const invalidOffer = validateOffer({ isSpecialOffer: true }, product)
      if (invalidOffer) return sendError(res, invalidOffer, 400)
    } else {
      await Product.updateOne({ _id: product._id }, { $unset: { oldPrice: '' } })
      product.oldPrice = undefined
    }
    product.isSpecialOffer = wantOffer
  }
  const updated = await product.save()
  return sendSuccess(res, updated, 'Product updated')
})
