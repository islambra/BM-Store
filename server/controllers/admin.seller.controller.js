import mongoose from 'mongoose'
import Seller from '../models/Seller.js'
import User from '../models/User.js'
import Store from '../models/Store.js'
import StoreRequest from '../models/StoreRequest.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Order from '../models/Order.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { ORDER_STATUSES, isValidTransition } from '../models/Order.js'
import { deleteGridFSByUrl } from '../utils/gridfs.js'

// Seller list
export const adminListSellers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status
  if (req.query.q) {
    const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { fullName: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { phone: { $regex: safe, $options: 'i' } },
    ]
  }

  const [sellers, total] = await Promise.all([
    Seller.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Seller.countDocuments(query),
  ])

  // Get store info for each seller
  const sellerIds = sellers.map((s) => s._id)
  const stores = await Store.find({ seller: { $in: sellerIds } }).lean()
  const storeBySeller = Object.fromEntries(stores.map((s) => [String(s.seller), s]))

  // Get stats
  const storeIds = stores.map((s) => s._id)
  const [productStats, orderStats] = await Promise.all([
    Product.aggregate([
      { $match: { store: { $in: storeIds } } },
      { $group: { _id: '$store', totalProducts: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { store: { $in: storeIds }, status: { $nin: ['cancelled', 'rejected'] } } },
      { $group: { _id: '$store', totalOrders: { $sum: 1 }, deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } } } },
    ]),
  ])

  const productStatByStore = Object.fromEntries(productStats.map((s) => [String(s._id), s]))
  const orderStatByStore = Object.fromEntries(orderStats.map((s) => [String(s._id), s]))

  const now = new Date()
  const withStats = sellers.map((seller) => {
    const store = storeBySeller[String(seller._id)]
    const pStat = store ? productStatByStore[String(store._id)] : null
    const oStat = store ? orderStatByStore[String(store._id)] : null
    const endDate = store?.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null
    const daysRemaining = endDate && endDate > now ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
    return {
      ...seller,
      store: store ? {
        id: store._id,
        name: store.name,
        slug: store.slug,
        status: store.status,
        subscriptionPlan: store.subscriptionPlan,
        subscriptionEndDate: store.subscriptionEndDate,
        daysRemaining,
        isExpired: Boolean(endDate && endDate <= now),
      } : null,
      stats: {
        totalProducts: pStat?.totalProducts || 0,
        totalOrders: oStat?.totalOrders || 0,
        deliveredOrders: oStat?.deliveredOrders || 0,
        deliveredRevenue: Math.round(oStat?.deliveredRevenue || 0),
      },
    }
  })

  return sendSuccess(res, { sellers: withStats, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminDeleteSeller = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Seller not found', 404)

  const seller = await Seller.findById(req.params.id).lean()
  if (!seller) return sendError(res, 'Seller not found', 404)

  const store = await Store.findOne({ seller: seller._id }).lean()

  // Collect product image URLs so they can be removed from storage too.
  const products = store
    ? await Product.find({ store: store._id }).select('image thumbnail images').lean()
    : []
  const imageUrls = products.flatMap((p) =>
    ['image', 'thumbnail', ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean)
  )

  await Promise.all([
    User.deleteOne({ _id: seller.user }),
    Seller.deleteOne({ _id: seller._id }),
    StoreRequest.deleteMany({ seller: seller._id }),
    store
      ? Promise.all([
          Store.deleteOne({ _id: store._id }),
          Product.deleteMany({ store: store._id }),
          Category.deleteMany({ store: store._id }),
          Order.deleteMany({ store: store._id }),
        ])
      : Promise.resolve(),
  ])
  await Promise.all(imageUrls.map((url) => deleteGridFSByUrl(url).catch(() => {})))

  return sendSuccess(res, { id: String(seller._id) }, 'Seller deleted with all their data')
})

export const adminGetSeller = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Seller not found', 404)

  const seller = await Seller.findById(req.params.id).lean()
  if (!seller) return sendError(res, 'Seller not found', 404)

  const store = await Store.findOne({ seller: seller._id }).lean()
  let stats = { totalProducts: 0, totalOrders: 0, deliveredOrders: 0, deliveredRevenue: 0 }

  if (store) {
    const [pStat, oStat] = await Promise.all([
      Product.aggregate([
        { $match: { store: store._id } },
        { $group: { _id: null, totalProducts: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { store: store._id, status: { $nin: ['cancelled', 'rejected'] } } },
        { $group: { _id: null, totalOrders: { $sum: 1 }, deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } } } },
      ]),
    ])
    stats = {
      totalProducts: pStat[0]?.totalProducts || 0,
      totalOrders: oStat[0]?.totalOrders || 0,
      deliveredOrders: oStat[0]?.deliveredOrders || 0,
      deliveredRevenue: Math.round(oStat[0]?.deliveredRevenue || 0),
    }
  }

  return sendSuccess(res, { seller: { ...seller, store, stats } })
})

// Store Requests
export const adminListStoreRequests = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status
  if (req.query.isRenewal !== undefined) query.isRenewal = req.query.isRenewal === 'true'

  const [requests, total] = await Promise.all([
    StoreRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StoreRequest.countDocuments(query),
  ])

  return sendSuccess(res, { requests, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminGetStoreRequest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store request not found', 404)

  const request = await StoreRequest.findById(req.params.id).lean()
  if (!request) return sendError(res, 'Store request not found', 404)

  return sendSuccess(res, { request })
})

export const adminApproveStoreRequest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store request not found', 404)

  const request = await StoreRequest.findById(req.params.id)
  if (!request) return sendError(res, 'Store request not found', 404)

  if (request.status !== 'pending') return sendError(res, 'Request has already been processed', 400)

  if (request.isRenewal) {
    // Renewal request - extend subscription. Any unexpired time left on the
    // current plan is carried over and added on top of the new plan period.
    const store = await Store.findById(request.store)
    if (!store) return sendError(res, 'Store not found', 404)

    const now = new Date()
    const currentEnd = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null
    const startDate = now
    const endDate = new Date(currentEnd && currentEnd > now ? currentEnd : now)
    if (request.subscriptionPlan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    store.status = 'active'
    store.subscriptionPlan = request.subscriptionPlan
    store.subscriptionStartDate = startDate
    store.subscriptionEndDate = endDate
    await store.save()

    request.status = 'approved'
    request.reviewedAt = new Date()
    request.reviewedBy = req.user._id
    await request.save()

    return sendSuccess(res, { store, request }, 'Subscription renewed successfully')
  } else {
    // New store request
    // Check slug availability again
    const slugExists = await Store.exists({ slug: request.slug })
    if (slugExists) return sendError(res, 'Store URL is no longer available', 400)

    const startDate = new Date()
    const endDate = new Date(startDate)
    if (request.subscriptionPlan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    const store = await Store.create({
      seller: request.seller,
      name: request.storeName,
      slug: request.slug,
      description: request.storeDescription,
      descriptionAr: request.storeDescriptionAr,
      logo: request.storeLogo,
      phone: request.storePhone,
      wilaya: request.wilaya,
      city: request.city,
      status: 'active',
      subscriptionPlan: request.subscriptionPlan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    })

    request.status = 'approved'
    request.reviewedAt = new Date()
    request.reviewedBy = req.user._id
    await request.save()

    return sendSuccess(res, { store, request }, 'Store approved and activated', 201)
  }
})

export const adminRejectStoreRequest = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body ?? {}

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store request not found', 404)

  const request = await StoreRequest.findById(req.params.id)
  if (!request) return sendError(res, 'Store request not found', 404)

  if (request.status !== 'pending') return sendError(res, 'Request has already been processed', 400)

  request.status = 'rejected'
  request.rejectionReason = rejectionReason?.trim()
  request.reviewedAt = new Date()
  request.reviewedBy = req.user._id
  await request.save()

  // If it was a renewal request, the store status remains as is (likely expired)
  // If it was a new store request, no store was created

  return sendSuccess(res, { request }, 'Store request rejected')
})

// Store management
export const adminListStores = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status
  if (req.query.q) {
    const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { slug: { $regex: safe, $options: 'i' } },
    ]
  }

  const [stores, total] = await Promise.all([
    Store.find(query)
      .populate('seller', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Store.countDocuments(query),
  ])

  // Get stats
  const storeIds = stores.map((s) => s._id)
  const [productStats, orderStats] = await Promise.all([
    Product.aggregate([
      { $match: { store: { $in: storeIds } } },
      { $group: { _id: '$store', totalProducts: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { store: { $in: storeIds }, status: { $nin: ['cancelled', 'rejected'] } } },
      { $group: { _id: '$store', totalOrders: { $sum: 1 }, deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } } } },
    ]),
  ])

  const productStatByStore = Object.fromEntries(productStats.map((s) => [String(s._id), s]))
  const orderStatByStore = Object.fromEntries(orderStats.map((s) => [String(s._id), s]))

  const withStats = stores.map((store) => {
    const pStat = productStatByStore[String(store._id)]
    const oStat = orderStatByStore[String(store._id)]
    return {
      ...store,
      stats: {
        totalProducts: pStat?.totalProducts || 0,
        totalOrders: oStat?.totalOrders || 0,
        deliveredOrders: oStat?.deliveredOrders || 0,
        deliveredRevenue: Math.round(oStat?.deliveredRevenue || 0),
      },
    }
  })

  return sendSuccess(res, { stores: withStats, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminGetStore = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store not found', 404)

  const store = await Store.findById(req.params.id).populate('seller', 'fullName email phone').lean()
  if (!store) return sendError(res, 'Store not found', 404)

  const [pStat, oStat] = await Promise.all([
    Product.aggregate([
      { $match: { store: store._id } },
      { $group: { _id: null, totalProducts: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { store: store._id, status: { $nin: ['cancelled', 'rejected'] } } },
      { $group: { _id: null, totalOrders: { $sum: 1 }, deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }, deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } } } },
    ]),
  ])

  return sendSuccess(res, {
    store: {
      ...store,
      stats: {
        totalProducts: pStat[0]?.totalProducts || 0,
        totalOrders: oStat[0]?.totalOrders || 0,
        deliveredOrders: oStat[0]?.deliveredOrders || 0,
        deliveredRevenue: Math.round(oStat[0]?.deliveredRevenue || 0),
      },
    },
  })
})

export const adminSuspendStore = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store not found', 404)

  const store = await Store.findById(req.params.id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (store.status === 'suspended') return sendError(res, 'Store is already suspended', 400)

  store.status = 'suspended'
  await store.save()

  return sendSuccess(res, { store }, 'Store suspended')
})

export const adminActivateStore = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Store not found', 404)

  const store = await Store.findById(req.params.id)
  if (!store) return sendError(res, 'Store not found', 404)

  if (store.status === 'active') return sendError(res, 'Store is already active', 400)

  // Check subscription
  const now = new Date()
  const endDate = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null
  if (endDate && endDate <= now) {
    return sendError(res, 'Cannot activate store with expired subscription. Approve a renewal first.', 400)
  }

  store.status = 'active'
  await store.save()

  return sendSuccess(res, { store }, 'Store activated')
})

// Seller Products (admin view)
export const adminListSellerProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = { ownerType: 'SELLER' }
  if (req.query.store) query.store = req.query.store
  if (req.query.q) {
    const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { nameAr: { $regex: safe, $options: 'i' } },
    ]
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('store', 'name slug')
      .populate('seller', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ])

  return sendSuccess(res, { products, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminDeleteSellerProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Product not found', 404)

  const product = await Product.findOneAndDelete({ _id: req.params.id, ownerType: 'SELLER' })
  if (!product) return sendError(res, 'Seller product not found', 404)

  const images = ['image', 'thumbnail', ...(Array.isArray(product.images) ? product.images : [])]
  await Promise.all(images.map((img) => deleteGridFSByUrl(img)))

  return sendSuccess(res, null, 'Product deleted')
})

// Seller Orders (admin view)
export const adminListSellerOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.store) query.store = req.query.store
  if (req.query.status) query.status = req.query.status
  if (req.query.ownerType === 'SELLER') {
    const storeIds = await Store.find({}).distinct('_id')
    query.store = { $in: storeIds }
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('store', 'name slug')
      .populate('user', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ])

  return sendSuccess(res, { orders, page, limit, total, pages: Math.ceil(total / limit) })
})

export const adminUpdateSellerOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  if (!status) return sendError(res, 'Status is required', 400)

  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Order not found', 404)

  const order = await Order.findById(req.params.id)
  if (!order) return sendError(res, 'Order not found', 404)

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
        { _id: item.productId },
        { $inc: { confirmedSales: item.qty } }
      )
    }
  }

  order.status = status
  await order.save()

  return sendSuccess(res, { order }, 'Order status updated')
})