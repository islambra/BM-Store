import crypto from 'node:crypto'
import Order, { ORDER_STATUSES, isValidTransition } from '../models/Order.js'
import Product from '../models/Product.js'
import Commission from '../models/Commission.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import {
  allocateCustomerOrderNumber,
  calcCustomerDiscountAmount,
  getCustomerDiscountPercent,
  peekNextCustomerDiscount,
} from '../utils/customerDiscount.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

export const DELIVERY_FEE = 350
const COMMISSION_RATE = 10

const randomRef = () => `BM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

const isValidStatus = (s) => ORDER_STATUSES.includes(s)

/**
 * Resolves the active referral for an order. The referral must be valid at the
 * moment the order is created and must belong to this customer's identity
 * (visitor id or linked account). A suspended marketer must not receive new
 * attribution. Once attributed, the order permanently belongs to the marketer,
 * even if the referral window expires or the marketer is later suspended.
 */
async function resolveActiveReferral(req, referralId, visitorId) {
  if (!req.user?._id && !referralId) return null
  const now = new Date()
  let ref = null

  if (referralId && req.user?._id) {
    // A client-supplied referral is only accepted when it belongs to this
    // visitor/customer — cross-visitor referrals cannot be attached.
    const owned = await Referral.findOne({
      _id: referralId,
      active: true,
      expiresAt: { $gt: now },
      $or: [{ customer: req.user._id }, { visitor: visitorId || '__none__' }],
    })
      .sort({ createdAt: -1 })
      .lean()
    if (owned) ref = owned
  }

  if (!ref && req.user?._id) {
    ref = await Referral.findOne({ customer: req.user._id, active: true, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .lean()
  }

  if (!ref) return null

  // Suspended marketers never gain new customers on orders created while they
  // are suspended (existing attributed orders/earnings are untouched).
  const profile = await MarketerProfile.findOne({ user: ref.marketer }).lean()
  if (!profile || profile.status !== 'active') return null

  return ref
}

/**
 * Prices order items exclusively from the database. Client-supplied prices,
 * discounts, totals and order numbers are never trusted.
 * Special-offer products already carry their offer price in `product.price`,
 * so the customer order discount below applies once, at order level —
 * never stacked per product.
 */
async function priceItems(items) {
  const cleanItems = []
  for (const item of items) {
    const qty = Number(item?.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      return { error: { message: 'Invalid quantity in order', status: 400 } }
    }
    if (!item?.productId) {
      return { error: { message: 'Product ID is required for each item', status: 400 } }
    }

    const product = await Product.findById(item.productId).lean()
    if (!product) return { error: { message: `Product not found: ${item.productId}`, status: 404 } }
    if (!product.isActive) return { error: { message: `Product is not available: ${product.name}`, status: 400 } }
    if (product.stock < qty) return { error: { message: `Insufficient stock for: ${product.name}`, status: 400 } }

    cleanItems.push({
      productId: product._id,
      name: product.name,
      qty,
      price: product.price,
      image: product.image || undefined,
    })
  }
  const subtotal = cleanItems.reduce((sum, it) => sum + it.price * it.qty, 0)
  return { cleanItems, subtotal }
}

export const createOrder = asyncHandler(async (req, res) => {
  const { items, customer, referralId: requestedReferralId, clientKey: rawClientKey, visitorId: rawVisitorId } = req.body ?? {}

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Order must contain at least one item', 400)
  }

  const userId = req.user?._id
  const clientKey = typeof rawClientKey === 'string' ? rawClientKey.trim().slice(0, 80) : ''
  const visitorId = typeof rawVisitorId === 'string' ? rawVisitorId.trim().slice(0, 64) : ''

  // Idempotency: a retried / double-clicked checkout reuses the same clientKey
  // and gets the original order back — no second personal order number.
  if (userId && clientKey) {
    const existing = await Order.findOne({ user: userId, clientKey }).lean()
    if (existing) return sendSuccess(res, { order: existing, deduped: true }, 'Order request received', 200)
  }

  const priced = await priceItems(items)
  if (priced.error) return sendError(res, priced.error.message, priced.error.status)
  const { cleanItems, subtotal } = priced

  const delivery = customer ?? {}
  const required = ['fullName', 'phone', 'wilaya', 'commune', 'address']
  for (const field of required) {
    if (!String(delivery[field] ?? '').trim()) {
      return sendError(res, 'Missing delivery information', 400)
    }
  }

  const shipping = DELIVERY_FEE
  // NOTE: customerOrderNumber / discountPercent / discountAmount are assigned
  // below, server-side only. Anything with these names in req.body is ignored.

  let referredBy = null
  let marketerId = null
  let attributedReferralId = null
  let referralCode = null
  let referredAt = null
  let commissionAmount = 0

  const resolvedRef = await resolveActiveReferral(req, requestedReferralId, visitorId)

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

  // Personal order number + loyalty discount (backend is the source of truth).
  // Allocated at creation only — historical orders never change.
  // Concurrent checkouts for the same user could compute the same number: the
  // unique { user, customerOrderNumber } index rejects the loser (or the
  // duplicate clientKey), which retries with the next number — or returns the
  // already-created order when the clientKey collided (retried submission).
  let order = null
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    const customerOrderNumber = await allocateCustomerOrderNumber(userId)
    const discountPercent = getCustomerDiscountPercent(customerOrderNumber)
    const discountAmount = calcCustomerDiscountAmount(subtotal, discountPercent)
    try {
      order = await Order.create({
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
        customerOrderNumber,
        discountPercent,
        discountAmount,
        total: subtotal + shipping - discountAmount,
        status: 'pending-review',
        referredBy,
        marketer: marketerId,
        referralId: attributedReferralId,
        referralCode,
        referredAt,
        referralAttributed: Boolean(referredBy),
        commissionAmount,
        clientKey: clientKey || undefined,
      })
    } catch (e) {
      if (e.code !== 11000) throw e
      if (userId && clientKey) {
        const raced = await Order.findOne({ user: userId, clientKey }).lean()
        if (raced) return sendSuccess(res, { order: raced, deduped: true }, 'Order request received', 200)
      }
      if (attempt === 2) throw e
      while (await Order.exists({ orderRef })) orderRef = randomRef()
    }
  }

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
  const [orders, peek] = await Promise.all([
    Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    peekNextCustomerDiscount(req.user._id),
  ])
  return sendSuccess(res, { orders, ...peek })
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

    const priced = await priceItems(items)
    if (priced.error) return sendError(res, priced.error.message, priced.error.status)
    const { cleanItems, subtotal } = priced

    order.items = cleanItems
    order.subtotal = subtotal
    // Personal order number + percent are immutable once allocated; only the
    // amount follows the edited subtotal (legacy orders without a percent
    // keep their stored total components untouched except items/subtotal).
    if (Number.isInteger(order.customerOrderNumber) && order.customerOrderNumber > 0) {
      order.discountPercent = getCustomerDiscountPercent(order.customerOrderNumber)
      order.discountAmount = calcCustomerDiscountAmount(subtotal, order.discountPercent)
      order.total = subtotal + order.delivery - order.discountAmount
    } else {
      order.discountAmount = 0
      order.total = subtotal + order.delivery
    }

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
  const set = { status: toStatus, ...extraFields }
  let updated = await Commission.findOneAndUpdate(
    { order: order._id, status: 'PENDING' },
    { $set: set },
    { new: true }
  )
  if (!updated) {
    // Commission record missing (order created before it was persisted, or a
    // legacy order) — materialize it with the target status. The sparse unique
    // {order} index makes this idempotent: a concurrent write wins with 11000.
    try {
      updated = await Commission.create({
        marketer: order.marketer,
        order: order._id,
        orderId: order.orderRef,
        rate: COMMISSION_RATE,
        amount: order.commissionAmount,
        ...set,
      })
    } catch (e) {
      if (e.code !== 11000) throw e
      return true
    }
  }

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