import mongoose from 'mongoose'
import Store from '../models/Store.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Order from '../models/Order.js'
import Seller from '../models/Seller.js'
import StoreRequest from '../models/StoreRequest.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { deleteGridFSByUrl } from '../utils/gridfs.js'
import { reverseOrderEffects } from './order.controller.js'
import { getAdminPaymentInfo } from '../utils/paymentInfo.js'

// Helper to get seller from request
async function getSellerFromReq(req) {
  return Seller.findOne({ phone: req.user.phone }).lean()
}

// Helper to get seller's store
async function getSellerStore(sellerId) {
  return Store.findOne({ seller: sellerId }).lean()
}

export const getMyStore = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  return sendSuccess(res, { store })
})

export const updateMyStore = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await Store.findOne({ seller: seller._id })
  if (!store) return sendError(res, 'Store not found', 404)

  const { name, description, descriptionAr, logo, phone, wilaya, city } = req.body ?? {}

  if (name !== undefined) store.name = String(name).trim()
  if (description !== undefined) store.description = String(description).trim()
  if (descriptionAr !== undefined) store.descriptionAr = String(descriptionAr).trim()
  if (logo !== undefined) store.logo = String(logo).trim() || undefined
  if (phone !== undefined) store.phone = String(phone).trim()
  if (wilaya !== undefined) store.wilaya = String(wilaya).trim()
  if (city !== undefined) store.city = String(city).trim()

  await store.save()
  return sendSuccess(res, { store }, 'Store updated')
})

// Products
const productSlugify = (name) =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'product'

async function uniqueProductSlug(name, storeId, exceptId) {
  const base = productSlugify(name)
  if (!exceptId && !(await Product.exists({ slug: base }))) return base
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`
    const exists = await Product.exists({ slug: candidate, _id: { $ne: exceptId } })
    if (!exists) return candidate
  }
  return `${base}-${Date.now()}`
}

const pickSellerProductFields = (body, current = null) => {
  const out = {}
  const fields = [
    'name', 'nameAr', 'nameFr', 'description', 'descriptionAr', 'descriptionFr',
    'image', 'thumbnail', 'category', 'categoryName', 'tags',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  if (body.images !== undefined) out.images = Array.isArray(body.images) ? body.images.slice(0, 5) : []
  if (body.price !== undefined) out.price = Number(body.price)
  if (body.isSpecialOffer !== undefined) out.isSpecialOffer = Boolean(body.isSpecialOffer)

  const isOffer = out.isSpecialOffer ?? current?.isSpecialOffer ?? false
  if (body.oldPrice !== undefined) {
    if (isOffer) out.oldPrice = Number(body.oldPrice) > 0 ? Number(body.oldPrice) : undefined
    else out.oldPrice = null
  } else if (!isOffer && current?.oldPrice) {
    out.oldPrice = null
  }
  out.discount = 0
  return out
}

const validateSellerOffer = (body, current) => {
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

export const listMyProducts = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = { store: store._id }
  if (req.query.q) {
    const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
    ]
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(query),
  ])

  return sendSuccess(res, { products, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getMyProduct = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Product not found', 404)

  const product = await Product.findOne({ _id: req.params.id, store: store._id }).lean()
  if (!product) return sendError(res, 'Product not found', 404)

  return sendSuccess(res, product)
})

export const createMyProduct = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (store.status !== 'active') return sendError(res, 'Store must be active to create products', 400)

  const body = req.body ?? {}
  const arabicName = String(body.nameAr ?? '').trim()
  const englishName = String(body.name ?? '').trim()
  if (!arabicName || !englishName || !Number.isFinite(Number(body.price)) || !String(body.category ?? '').trim()) {
    return sendError(res, 'Product name (Arabic and English), price and category are required', 400)
  }

  const invalidOffer = validateSellerOffer(body)
  if (invalidOffer) return sendError(res, invalidOffer, 400)

  // Validate images count
  if (body.images && Array.isArray(body.images) && body.images.length > 5) {
    return sendError(res, 'Maximum 5 images allowed', 400)
  }

  const data = pickSellerProductFields(body)
  data.name = englishName
  data.nameAr = arabicName
  if (body.descriptionAr !== undefined) data.descriptionAr = String(body.descriptionAr).trim() || undefined
  if (body.description !== undefined) data.description = String(body.description).trim() || undefined
  delete data.nameFr
  delete data.descriptionFr

  if (data.oldPrice === undefined || data.oldPrice === null) delete data.oldPrice

  data.slug = await uniqueProductSlug(data.name, store._id)
  data.store = store._id
  data.seller = seller._id
  data.ownerType = 'SELLER'

  const product = await Product.create(data)
  return sendSuccess(res, product, 'Product created', 201)
})

export const updateMyProduct = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Product not found', 404)

  const product = await Product.findOne({ _id: req.params.id, store: store._id })
  if (!product) return sendError(res, 'Product not found', 404)

  const invalidOffer = validateSellerOffer(req.body ?? {}, product)
  if (invalidOffer) return sendError(res, invalidOffer, 400)

  // Validate images count
  if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 5) {
    return sendError(res, 'Maximum 5 images allowed', 400)
  }

  const data = pickSellerProductFields(req.body ?? {}, product)

  if (data.nameAr !== undefined) data.nameAr = String(data.nameAr).trim() || product.nameAr
  if (data.name !== undefined) data.name = String(data.name).trim() || product.name
  if (data.descriptionAr !== undefined) data.descriptionAr = String(data.descriptionAr).trim()
  if (data.description !== undefined) data.description = String(data.description).trim()

  delete data.nameFr
  delete data.descriptionFr

  const unsetOldPrice = data.oldPrice === null
  if (unsetOldPrice) {
    await Product.updateOne({ _id: product._id }, { $unset: { oldPrice: '' } })
    product.oldPrice = undefined
  }
  if (unsetOldPrice || data.oldPrice === undefined) delete data.oldPrice

  if (data.name && data.name !== product.name) {
    data.slug = await uniqueProductSlug(data.name, store._id, product._id)
  }

  Object.assign(product, data)
  const updated = await product.save()
  return sendSuccess(res, updated, 'Product updated')
})

export const deleteMyProduct = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Product not found', 404)

  const product = await Product.findOneAndDelete({ _id: req.params.id, store: store._id })
  if (!product) return sendError(res, 'Product not found', 404)

  const images = ['image', 'thumbnail', ...(Array.isArray(product.images) ? product.images : [])]
  await Promise.all(images.map((img) => deleteGridFSByUrl(img)))

  return sendSuccess(res, null, 'Product deleted')
})

// Categories
export const listMyCategories = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const categories = await Category.find({ store: store._id }).sort({ order: 1, createdAt: 1 }).lean()
  return sendSuccess(res, { categories })
})

export const createMyCategory = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const { name, nameAr, nameFr, image, icon, order } = req.body ?? {}
  if (!name?.trim() || !nameAr?.trim()) {
    return sendError(res, 'Name (EN) and Name (Arabic) are required', 400)
  }

  const slugBase = String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'category'

  const base = {
    store: store._id,
    name: name.trim(),
    nameAr: nameAr.trim(),
    nameFr: nameFr?.trim(),
    image,
    icon,
    order: Number(order) || 0,
    active: true,
  }

  let slug = slugBase
  let category = null
  for (let counter = 1; counter < 50 && !category; counter += 1) {
    try {
      category = await Category.create({ ...base, slug })
    } catch (err) {
      if (err?.code !== 11000) throw err
      slug = counter === 1 ? `${slugBase}-1` : `${slugBase}-${counter}`
    }
  }
  if (!category) category = await Category.create({ ...base, slug: `${slugBase}-${Date.now()}` })

  return sendSuccess(res, category, 'Category created', 201)
})

export const updateMyCategory = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Category not found', 404)

  const category = await Category.findOne({ _id: req.params.id, store: store._id })
  if (!category) return sendError(res, 'Category not found', 404)

  const { name, nameAr, nameFr, image, icon, order, active, slug } = req.body ?? {}

  if (name !== undefined) category.name = String(name).trim()
  if (nameAr !== undefined) category.nameAr = String(nameAr).trim()
  if (nameFr !== undefined) category.nameFr = String(nameFr).trim()
  if (image !== undefined) category.image = String(image).trim() || undefined
  if (icon !== undefined) category.icon = String(icon).trim() || undefined
  if (order !== undefined) category.order = Number(order) || 0
  if (active !== undefined) category.active = Boolean(active)
  if (slug !== undefined) {
    const newSlug = String(slug).toLowerCase().trim()
    if (newSlug !== category.slug) {
      const exists = await Category.exists({ slug: newSlug, store: store._id, _id: { $ne: category._id } })
      if (exists) return sendError(res, 'This slug is already in use', 400)
      category.slug = newSlug
    }
  }

  await category.save()
  return sendSuccess(res, category, 'Category updated')
})

export const deleteMyCategory = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Category not found', 404)

  const category = await Category.findOne({ _id: req.params.id, store: store._id })
  if (!category) return sendError(res, 'Category not found', 404)

  // Check if any products use this category
  const productsCount = await Product.countDocuments({ store: store._id, category: category.slug })
  if (productsCount > 0) {
    return sendError(res, `Cannot delete category. ${productsCount} product(s) are using this category. Please move or delete them first.`, 400)
  }

  await Category.deleteOne({ _id: category._id })
  return sendSuccess(res, null, 'Category deleted')
})

// Orders
export const listMyOrders = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = { store: store._id }
  if (req.query.status) query.status = req.query.status

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name phone')
      .lean(),
    Order.countDocuments(query),
  ])

  return sendSuccess(res, { orders, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getMyOrder = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Order not found', 404)

  const order = await Order.findOne({ _id: req.params.id, store: store._id })
    .populate('user', 'name phone')
    .lean()

  if (!order) return sendError(res, 'Order not found', 404)

  return sendSuccess(res, { order })
})

export const updateMyOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  if (!status) return sendError(res, 'Status is required', 400)

  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Order not found', 404)

  const order = await Order.findOne({ _id: req.params.id, store: store._id })
  if (!order) return sendError(res, 'Order not found', 404)

  const { isValidTransition, ORDER_STATUSES } = await import('../models/Order.js')
  if (!ORDER_STATUSES.includes(status)) {
    return sendError(res, 'Invalid order status', 400)
  }

  if (!isValidTransition(order.status, status)) {
    return sendError(res, `Cannot transition from "${order.status}" to "${status}"`, 400)
  }

  const previousStatus = order.status
  const wasConfirmed = previousStatus !== 'confirmed' && status === 'confirmed'
  const wasDelivered = previousStatus !== 'delivered' && status === 'delivered'

  // Confirming an order increments product confirmedSales (no stock tracking).
  if (wasConfirmed) {
    for (const item of order.items) {
      if (!item.productId) continue
      await Product.updateOne(
        { _id: item.productId, store: store._id },
        { $inc: { confirmedSales: item.qty } }
      )
    }
  }

  order.status = status
  await order.save()

  return sendSuccess(res, { order }, 'Order status updated')
})

/**
 * Seller permanently deletes one of their own store's orders. Reverses
 * confirmedSales when the order was confirmed/delivered before removing the
 * record.
 */
export const deleteMyOrder = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Order not found', 404)

  const order = await Order.findOne({ _id: req.params.id, store: store._id })
  if (!order) return sendError(res, 'Order not found', 404)

  await reverseOrderEffects(order)
  await Order.deleteOne({ _id: order._id })
  return sendSuccess(res, null, 'Order deleted')
})

// Earnings/Statistics
export const getMyEarnings = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalProducts, totalOrders, pendingOrders, deliveredOrders, cancelledOrders, deliveredRevenue, monthlyRevenue] = await Promise.all([
    Product.countDocuments({ store: store._id }),
    Order.countDocuments({ store: store._id }),
    Order.countDocuments({ store: store._id, status: 'pending' }),
    Order.countDocuments({ store: store._id, status: 'delivered' }),
    Order.countDocuments({ store: store._id, status: 'cancelled' }),
    Order.aggregate([
      { $match: { store: store._id, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { store: store._id, status: 'delivered', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ])

  return sendSuccess(res, {
    stats: {
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      deliveredRevenue: deliveredRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
    },
  })
})

// Subscription
export const getMySubscription = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  const now = new Date()
  const endDate = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null
  const daysRemaining = endDate && endDate > now ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
  const isExpired = endDate && endDate <= now

  return sendSuccess(res, {
    subscription: {
      plan: store.subscriptionPlan,
      status: isExpired ? 'expired' : store.status,
      startDate: store.subscriptionStartDate,
      endDate: store.subscriptionEndDate,
      daysRemaining: Math.max(0, daysRemaining),
      isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
    },
    paymentInfo: await getAdminPaymentInfo(),
  })
})

export const submitRenewalRequest = asyncHandler(async (req, res) => {
  const seller = await getSellerFromReq(req)
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const store = await getSellerStore(seller._id)
  if (!store) return sendError(res, 'Store not found', 404)

  // Check if there's already a pending renewal request
  const existingRequest = await StoreRequest.findOne({ store: store._id, isRenewal: true, status: 'pending' }).lean()
  if (existingRequest) return sendError(res, 'You already have a pending renewal request', 400)

  const { subscriptionPlan, paymentProof } = req.body ?? {}

  if (!subscriptionPlan || !paymentProof?.trim()) {
    return sendError(res, 'Subscription plan and payment proof are required', 400)
  }

  if (!['monthly', 'yearly'].includes(subscriptionPlan)) {
    return sendError(res, 'Invalid subscription plan', 400)
  }

  const expectedAmount = subscriptionPlan === 'monthly' ? 2500 : 25000

  const renewalRequest = await StoreRequest.create({
    seller: seller._id,
    store: store._id,
    isRenewal: true,
    sellerName: seller.fullName,
    sellerEmail: seller.email,
    sellerPhone: seller.phone,
    storeName: store.name,
    storeDescription: store.description,
    storeDescriptionAr: store.descriptionAr,
    storeLogo: store.logo,
    storePhone: store.phone,
    wilaya: store.wilaya,
    city: store.city,
    slug: store.slug,
    subscriptionPlan,
    expectedAmount,
    paymentProof: paymentProof.trim(),
    status: 'pending',
  })

  return sendSuccess(res, { storeRequest: renewalRequest }, 'Renewal request submitted for review', 201)
})