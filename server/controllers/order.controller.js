import crypto from 'node:crypto'
import Order, { ORDER_STATUSES, isValidTransition } from '../models/Order.js'
import Product from '../models/Product.js'
import Commission from '../models/Commission.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Reward, { getRewardDiscount } from '../models/Reward.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

export const DELIVERY_FEE = 350
const COMMISSION_RATE = 10

const randomRef = () => `BM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

const isValidStatus = (s) => ORDER_STATUSES.includes(s)

/**
 * Resolves the active referral for an order. The referral must be valid at the
 * moment the order is created. Once attributed, the order permanently belongs
 * to the marketer, even if the referral window expires or the marketer is later
 * suspended.
 */
async function resolveActiveReferral(req, referralId) {
  if (!req.user?._id && !referralId) return null
  const now = new Date()
  let ref = null

  if (referralId) {
    const candidate = await Referral.findOne({ _id: referralId, active: true, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .lean()
    if (candidate) ref = candidate
  }

  if (!ref && req.user?._id) {
    ref = await Referral.findOne({ customer: req.user._id, active: true, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .lean()
  }

  return ref
}

export const createOrder = asyncHandler(async (req, res) => {
  const { items, customer, referralId: requestedReferralId } = req.body ?? {}

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Order must contain at least one item', 400)
  }

  const userId = req.user?._id

  const rewardMap = new Map()
  if (userId) {
    const rewardDocs = await Reward.find({ user: userId }).lean()
    for (const r of rewardDocs) rewardMap.set(String(r.product), r.purchaseCount)
  }

  const cleanItems = []
  let totalRewardDiscount = 0

  for (const item of items) {
    const qty = Number(item?.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      return sendError(res, 'Invalid quantity in order', 400)
    }
    if (!item?.productId) {
      return sendError(res, 'Product ID is required for each item', 400)
    }

    const product = await Product.findById(item.productId).lean()
    if (!product) return sendError(res, `Product not found: ${item.productId}`, 404)
    if (!product.isActive) return sendError(res, `Product is not available: ${product.name}`, 400)
    if (product.stock < qty) return sendError(res, `Insufficient stock for: ${product.name}`, 400)

    let rewardDiscount = 0
    if (userId && product.isRewardEligible) {
      const count = rewardMap.get(String(product._id)) || 0
      const rate = getRewardDiscount(count)
      rewardDiscount = Math.round((product.price * rate) / 100) * qty
      totalRewardDiscount += rewardDiscount
    }

    cleanItems.push({
      productId: product._id,
      name: product.name,
      qty,
      price: product.price,
      image: product.image || undefined,
      rewardDiscount,
    })
  }

  const delivery = customer ?? {}
  const required = ['fullName', 'phone', 'wilaya', 'commune', 'address']
  for (const field of required) {
    if (!String(delivery[field] ?? '').trim()) {
      return sendError(res, 'Missing delivery information', 400)
    }
  }

  const subtotal = cleanItems.reduce((sum, it) => sum + it.price * it.qty, 0)
  const shipping = DELIVERY_FEE
  const total = subtotal + shipping - totalRewardDiscount

  let referredBy = null
  let marketerId = null
  let attributedReferralId = null
  let referralCode = null
  let referredAt = null
  let commissionAmount = 0

  const resolvedRef = await resolveActiveReferral(req, requestedReferralId)

  if (resolvedRef) {
    const profile = await MarketerProfile.findOne({ user: resolvedRef.marketer }).lean()
    if (profile && String(profile.user) !== String(userId)) {
      referredBy = profile._id
      marketerId = profile.user
      attributedReferralId = resolvedRef._id
      referralCode = resolvedRef.referralCode
      referredAt = new Date()
      commissionAmount = Math.round(subtotal * (COMMISSION_RATE / 100) * 100) / 100
    }
  }

  let orderRef = randomRef()
  while (await Order.exists({ orderRef })) orderRef = randomRef()

  const order = await Order.create({
    orderRef,
    user: userId,
    items: cleanItems,
    customer: {
      fullName: String(delivery.fullName).trim(),
      phone: String(delivery.phone).trim(),
      wilaya: String(delivery.wilaya).trim(),
      wilayaName: delivery.wilayaName ? String(delivery.wilayaName).trim() : undefined,
      commune: String(delivery.commune).trim(),
      address: String(delivery.address).trim(),
      note: delivery.note ? String(delivery.note).trim() : undefined,
    },
    subtotal,
    delivery: shipping,
    rewardDiscount: totalRewardDiscount,
    total,
    status: 'pending-review',
    referredBy,
    marketer: marketerId,
    referralId: attributedReferralId,
    referralCode,
    referredAt,
    referralAttributed: Boolean(referredBy),
    commissionAmount,
  })

  if (commissionAmount > 0 && marketerId) {
    try {
      await Commission.create({
        marketer: marketerId,
        order: order._id,
        orderId: orderRef,
        rate: COMMISSION_RATE,
        amount: commissionAmount,
        status: 'PENDING',
      })
    } catch (e) {
      if (e.code !== 11000) throw e
    }
  }

  return sendSuccess(res, { order }, 'Order request received', 201)
})

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
  return sendSuccess(res, { orders })
})

async function findEditableOrder(req) {
  const order = await Order.findById(req.params.id)
  if (!order) return { error: { message: 'Order not found', status: 404 } }
  if (String(order.user) !== String(req.user._id)) {
    return { error: { message: 'Order not found', status: 404 } }
  }
  if (order.status !== 'pending-review') {
    return { error: { message: 'Order can no longer be modified', status: 400 } }
  }
  return { order }
}

/**
 * Customer edits their own order while it is still pending review
 * (before the store contacts them). Items are re-priced from the database,
 * stock is re-validated and totals are recomputed server-side.
 */
export const updateMyOrder = asyncHandler(async (req, res) => {
  const { order, error } = await findEditableOrder(req)
  if (error) return sendError(res, error.message, error.status)

  const { items, customer } = req.body ?? {}

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order must contain at least one item', 400)
    }

    const rewardMap = new Map()
    const rewardDocs = await Reward.find({ user: req.user._id }).lean()
    for (const r of rewardDocs) rewardMap.set(String(r.product), r.purchaseCount)

    const cleanItems = []
    let totalRewardDiscount = 0
    for (const item of items) {
      const qty = Number(item?.qty)
      if (!Number.isInteger(qty) || qty < 1) {
        return sendError(res, 'Invalid quantity in order', 400)
      }
      if (!item?.productId) {
        return sendError(res, 'Product ID is required for each item', 400)
      }
      const product = await Product.findById(item.productId).lean()
      if (!product) return sendError(res, `Product not found: ${item.productId}`, 404)
      if (!product.isActive) return sendError(res, `Product is not available: ${product.name}`, 400)
      if (product.stock < qty) return sendError(res, `Insufficient stock for: ${product.name}`, 400)

      let rewardDiscount = 0
      if (product.isRewardEligible) {
        const count = rewardMap.get(String(product._id)) || 0
        const rate = getRewardDiscount(count)
        rewardDiscount = Math.round((product.price * rate) / 100) * qty
        totalRewardDiscount += rewardDiscount
      }

      cleanItems.push({
        productId: product._id,
        name: product.name,
        qty,
        price: product.price,
        image: product.image || undefined,
        rewardDiscount,
      })
    }

    const subtotal = cleanItems.reduce((sum, it) => sum + it.price * it.qty, 0)
    order.items = cleanItems
    order.subtotal = subtotal
    order.rewardDiscount = totalRewardDiscount
    order.total = subtotal + order.delivery - totalRewardDiscount

    if (order.referredBy) {
      order.commissionAmount = Math.round(subtotal * (COMMISSION_RATE / 100) * 100) / 100
      await Commission.findOneAndUpdate(
        { order: order._id, status: 'PENDING' },
        { $set: { amount: order.commissionAmount } },
      )
    }
  }

  if (customer !== undefined) {
    const delivery = customer ?? {}
    for (const field of ['wilaya', 'commune', 'address']) {
      if (delivery[field] !== undefined && !String(delivery[field] ?? '').trim()) {
        return sendError(res, 'Missing delivery information', 400)
      }
    }
    if (delivery.wilaya !== undefined) order.customer.wilaya = String(delivery.wilaya).trim()
    if (delivery.wilayaName !== undefined) {
      order.customer.wilayaName = String(delivery.wilayaName).trim() || undefined
    }
    if (delivery.commune !== undefined) order.customer.commune = String(delivery.commune).trim()
    if (delivery.address !== undefined) order.customer.address = String(delivery.address).trim()
    if (delivery.note !== undefined) {
      order.customer.note = String(delivery.note).trim() || undefined
    }
  }

  await order.save()
  return sendSuccess(res, { order: order.toObject() }, 'Order updated')
})

/**
 * Customer deletes their own order while it is still pending review
 * (before the store contacts them).
 */
export const deleteMyOrder = asyncHandler(async (req, res) => {
  const { order, error } = await findEditableOrder(req)
  if (error) return sendError(res, error.message, error.status)

  await releaseCommission(order, 'CANCELLED')
  await Order.deleteOne({ _id: order._id })
  return sendSuccess(res, null, 'Order deleted')
})

async function releaseCommission(order, toStatus, extraFields = {}) {
  if (!order.commissionAmount || !order.referredBy) return false
  const updated = await Commission.findOneAndUpdate(
    { order: order._id, status: 'PENDING' },
    { $set: { status: toStatus, ...extraFields } },
    { new: true }
  )
  if (!updated) return false

  if (toStatus === 'AVAILABLE') {
    const profile = await MarketerProfile.findById(order.referredBy)
    if (profile) {
      profile.totalEarnings = Math.round((profile.totalEarnings + order.commissionAmount) * 100) / 100
      await profile.save()
    }
  }
  return true
}

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  if (!isValidStatus(status)) {
    return sendError(res, 'Invalid order status', 400)
  }

  const order = await Order.findById(req.params.id)
  if (!order) return sendError(res, 'Order not found', 404)

  if (!isValidTransition(order.status, status)) {
    return sendError(res, `Cannot transition from "${order.status}" to "${status}"`, 400)
  }

  const wasConfirmed = order.status !== 'confirmed' && status === 'confirmed'
  const wasDelivered = order.status !== 'delivered' && status === 'delivered'

  order.status = status
  await order.save()

  if (wasConfirmed) {
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, confirmedSales: item.qty } })
      }
    }

    if (order.user) {
      const eligible = await Product.find({ _id: { $in: order.items.map((it) => it.productId).filter(Boolean) }, isRewardEligible: true }).select('_id').lean()
      for (const product of eligible) {
        await Reward.updateOne(
          { user: order.user, product: product._id },
          { $inc: { purchaseCount: 1 }, $set: { lastPurchaseAt: new Date() } },
          { upsert: true }
        )
      }
    }
  }

  if (wasDelivered) {
    await releaseCommission(order, 'AVAILABLE', { availableAt: new Date() })
  }

  if (status === 'cancelled' || status === 'rejected') {
    await releaseCommission(order, 'CANCELLED')
  }

  return sendSuccess(res, { order }, 'Order status updated')
})

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('marketer', 'name phone').lean(),
    Order.countDocuments(query),
  ])
  return sendSuccess(res, { orders, page, limit, total, pages: Math.ceil(total / limit) })
})