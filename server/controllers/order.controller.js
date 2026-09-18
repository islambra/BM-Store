import crypto from 'node:crypto'
import Order, { ORDER_STATUSES, isValidTransition } from '../models/Order.js'
import Product from '../models/Product.js'
import Commission from '../models/Commission.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Store from '../models/Store.js'
import {
  allocateCustomerOrderNumber,
  applyRewardToItems,
  getLegacyDiscountPercent,
  calcDiscountAmount,
  peekNextCustomerOrderNumber,
} from '../utils/customerDiscount.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { getDeliveryInfo } from './wilaya.controller.js'
import { DEFAULT_DELIVERY_PRICE } from '../config/wilayas.js'

export const DELIVERY_FEE = DEFAULT_DELIVERY_PRICE
const COMMISSION_RATE = 10
const MAX_ORDER_ITEMS = 50
const MAX_ITEM_QTY = 999

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
 * Validates that all items belong to the same store (or BM Store).
 * Returns the store ID if valid, or an error. cleanItems must carry
 * ownerType / store fields populated by priceItems.
 */
async function validateSingleStore(cleanItems) {
  let storeId = null
  let isBmStore = false
  const sellerStoreIds = new Set()

  for (const item of cleanItems) {
    const productStoreId = item.store ? String(item.store) : null
    const productOwnerType = item.ownerType

    if (productOwnerType === 'BM_STORE' || !productStoreId) {
      if (storeId && storeId !== 'BM_STORE') {
        return { error: { message: 'Your cart contains products from different stores. Please complete or clear your current cart before adding products from a different store.', status: 400 } }
      }
      isBmStore = true
      storeId = 'BM_STORE'
    } else {
      if (isBmStore) {
        return { error: { message: 'Your cart contains products from different stores. Please complete or clear your current cart before adding products from a different store.', status: 400 } }
      }
      if (storeId && storeId !== productStoreId) {
        return { error: { message: 'Your cart contains products from different stores. Please complete or clear your current cart before adding products from a different store.', status: 400 } }
      }
      storeId = productStoreId
      sellerStoreIds.add(productStoreId)
    }
  }

  if (sellerStoreIds.size > 0) {
    const stores = await Store.find({ _id: { $in: [...sellerStoreIds] } }).lean()
    const byId = new Map(stores.map((s) => [String(s._id), s]))
    const now = new Date()
    for (const item of cleanItems) {
      const sid = item.store ? String(item.store) : null
      if (!sid || item.ownerType === 'BM_STORE') continue
      const store = byId.get(sid)
      if (!store) return { error: { message: `Store not found for product: ${item.name}`, status: 400 } }
      if (store.status !== 'active') return { error: { message: `Store "${store.name}" is not currently accepting orders.`, status: 400 } }
      if (store.subscriptionEndDate && new Date(store.subscriptionEndDate) <= now) {
        return { error: { message: `Store "${store.name}" has an expired subscription.`, status: 400 } }
      }
    }
  }

  return { storeId: storeId === 'BM_STORE' ? null : storeId, isBmStore }
}

/**
 * Prices order items exclusively from the database. Client-supplied prices,
 * discounts, totals and order numbers are never trusted.
 * Special-offer products already carry their offer price in `product.price`,
 * so the customer order discount below applies once, at order level —
 * never stacked per product.
 */
async function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { message: 'Order must contain at least one item', status: 400 } }
  }
  if (items.length > MAX_ORDER_ITEMS) {
    return { error: { message: `An order can contain at most ${MAX_ORDER_ITEMS} items`, status: 400 } }
  }

  const parsed = []
  for (const item of items) {
    const qty = Number(item?.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      return { error: { message: 'Invalid quantity in order', status: 400 } }
    }
    if (qty > MAX_ITEM_QTY) {
      return { error: { message: `Quantity per item cannot exceed ${MAX_ITEM_QTY}`, status: 400 } }
    }
    if (!item?.productId) {
      return { error: { message: 'Product ID is required for each item', status: 400 } }
    }
    parsed.push({ productId: item.productId, qty })
  }

  const ids = [...new Set(parsed.map((p) => String(p.productId)))]
  const products = await Product.find({ _id: { $in: ids } }).lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))

  const cleanItems = []
  for (const item of parsed) {
    const product = byId.get(String(item.productId))
    if (!product) return { error: { message: `Product not found: ${item.productId}`, status: 404 } }
    cleanItems.push({
      productId: product._id,
      name: product.name,
      qty: item.qty,
      price: product.price,
      image: product.image || undefined,
      category: product.category,
      ownerType: product.ownerType || 'BM_STORE',
      store: product.store ?? null,
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

  // Validate single store per order
  const storeValidation = await validateSingleStore(cleanItems)
  if (storeValidation.error) return sendError(res, storeValidation.error.message, storeValidation.error.status)
  const { storeId, isBmStore } = storeValidation

  const delivery = customer ?? {}
  const required = ['fullName', 'phone', 'commune', 'address']
  for (const field of required) {
    if (!String(delivery[field] ?? '').trim()) {
      return sendError(res, 'Missing delivery information', 400)
    }
  }
  if (!delivery.wilayaId && !String(delivery.wilaya ?? '').trim()) {
    return sendError(res, 'Missing delivery information', 400)
  }

  // Shipping is priced and snapshotted server-side from the destination
  // wilaya ("wilayaId"; a legacy "wilaya" code is still accepted). The client
  // can never influence the delivery price.
  const info = await getDeliveryInfo(delivery)
  if (info.error) return sendError(res, info.error, 400)
  const shipping = info.deliveryPrice
  // NOTE: customerOrderNumber / discountPercent / discountAmount are assigned
  // below, server-side only. Anything with these names in req.body is ignored.

  let referredBy = null
  let marketerId = null
  let attributedReferralId = null
  let referralCode = null
  let referredAt = null
  let commissionAmount = 0

  const resolvedRef = await resolveActiveReferral(req, requestedReferralId, visitorId)

  // Marketer commission ONLY for BM Store products
  if (resolvedRef && isBmStore) {
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

  // Reward order number + discount are NOT assigned at creation: the purchase
  // count only increases when the order is confirmed (server-side, in
  // updateOrderStatus). At creation a pending order simply has no discount —
  // totals are recomputed when the store/admin confirms it.
  let order = null
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    try {
      order = await Order.create({
        orderRef,
        user: userId,
        store: storeId,
        items: cleanItems,
        customer: {
          fullName: String(delivery.fullName).trim(),
          phone: String(delivery.phone).trim(),
          wilaya: info.wilayaCode,
          wilayaId: info.wilayaId ?? undefined,
          wilayaCode: info.wilayaCode,
          wilayaName: info.wilayaName,
          deliveryPrice: info.deliveryPrice,
          commune: String(delivery.commune).trim(),
          address: String(delivery.address).trim(),
          note: delivery.note ? String(delivery.note).trim() : undefined,
        },
        subtotal,
        delivery: shipping,
        total: subtotal + shipping,
        status: 'pending',
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

  // NOTE: no Commission record is created here. Marketer commissions are only
  // computed and credited when the order is DELIVERED (see updateOrderStatus),
  // so nothing is ever earned before delivery.

  return sendSuccess(res, { order }, 'Order request received', 201)
})

export const getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const userQuery = { user: req.user._id }
  const [orders, total, peek] = await Promise.all([
    Order.find(userQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(userQuery),
    peekNextCustomerOrderNumber(req.user._id),
  ])
  return sendSuccess(res, { orders, ...peek, page, limit, total, pages: Math.ceil(total / limit) })
})

async function findEditableOrder(req) {
  const order = await Order.findById(req.params.id)
  if (!order) return { error: { message: 'Order not found', status: 404 } }
  if (String(order.user) !== String(req.user._id)) {
    return { error: { message: 'Order not found', status: 404 } }
  }
  if (order.status !== 'pending') {
    return { error: { message: 'Order can no longer be modified', status: 400 } }
  }
  return { order }
}

/**
 * Customer edits their own order while it is still pending (before it is
 * confirmed). Items are re-priced from the database and totals are recomputed
 * server-side.
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

    // Validate single store per order
    const storeValidation = await validateSingleStore(cleanItems)
    if (storeValidation.error) return sendError(res, storeValidation.error.message, storeValidation.error.status)
const { storeId } = storeValidation

    // Check if store matches the original order's store
    const originalStoreId = order.store?.toString() || null
    const newStoreId = storeId
    if (originalStoreId !== newStoreId) {
      return sendError(res, 'Cannot change store for this order. Please create a new order for products from a different store.', 400)
    }

    order.items = cleanItems
    order.subtotal = subtotal
    if (Number.isInteger(order.customerOrderNumber) && order.customerOrderNumber > 0) {
      // Legacy order that already received its reward number: recompute the
      // amount from its immutable number (historical orders never change).
      order.discountPercent = getLegacyDiscountPercent(order.customerOrderNumber)
      order.discountAmount = calcDiscountAmount(subtotal, order.discountPercent)
      order.total = subtotal + order.delivery - order.discountAmount
    } else {
      // New-rule pending order: reward number + discount are assigned later
      // at confirmation, so a pending edit carries no discount yet.
      order.discountPercent = 0
      order.discountAmount = 0
      order.total = subtotal + order.delivery
    }

    if (order.referredBy) {
      order.commissionAmount = Math.round(subtotal * (COMMISSION_RATE / 100) * 100) / 100
    }
  }

  if (customer !== undefined) {
    const delivery = customer ?? {}
    for (const field of ['fullName', 'phone', 'wilaya', 'wilayaId', 'commune', 'address']) {
      if (delivery[field] !== undefined && !String(delivery[field] ?? '').trim()) {
        return sendError(res, 'Missing delivery information', 400)
      }
    }
    if (delivery.fullName !== undefined) order.customer.fullName = String(delivery.fullName).trim()
    if (delivery.phone !== undefined) order.customer.phone = String(delivery.phone).trim()
    if (delivery.wilaya !== undefined || delivery.wilayaId !== undefined) {
      // Re-resolve + resnapshot from the database on a wilaya change.
      const info = await getDeliveryInfo({
        wilayaId: delivery.wilayaId,
        wilaya: delivery.wilaya,
        wilayaName: delivery.wilayaName,
      })
      if (info.error) return sendError(res, info.error, 400)
      order.customer.wilaya = info.wilayaCode
      order.customer.wilayaId = info.wilayaId ?? undefined
      order.customer.wilayaCode = info.wilayaCode
      order.customer.wilayaName = info.wilayaName
      order.customer.deliveryPrice = info.deliveryPrice
      order.delivery = info.deliveryPrice
    } else if (delivery.wilayaName !== undefined) {
      order.customer.wilayaName = String(delivery.wilayaName).trim() || undefined
    }
    if (delivery.commune !== undefined) order.customer.commune = String(delivery.commune).trim()
    if (delivery.address !== undefined) order.customer.address = String(delivery.address).trim()
    if (delivery.note !== undefined) {
      order.customer.note = String(delivery.note).trim() || undefined
    }
  }

  // Recompute the total whenever items or the destination wilaya changed
  // (the shipping price is re-priced server-side from the new wilaya).
  if (customer?.wilaya !== undefined || customer?.wilayaId !== undefined || items !== undefined) {
    const discountAmount =
      Number.isInteger(order.customerOrderNumber) && order.customerOrderNumber > 0
        ? calcDiscountAmount(order.subtotal, getLegacyDiscountPercent(order.customerOrderNumber))
        : 0
    order.total = order.subtotal + order.delivery - discountAmount
  }

  await order.save()
  return sendSuccess(res, { order: order.toObject() }, 'Order updated')
})

/**
 * Customer deletes their own order while it is still pending (before it is
 * confirmed).
 */
export const deleteMyOrder = asyncHandler(async (req, res) => {
  const { order, error } = await findEditableOrder(req)
  if (error) return sendError(res, error.message, error.status)

  await cancelExistingCommission(order)
  await Order.deleteOne({ _id: order._id })
  return sendSuccess(res, null, 'Order deleted')
})

/**
 * Credits a BM Store referral order's marketer commission. Commissions are
 * only ever computed and credited when the order is DELIVERED — never at
 * creation or confirmation — and they are exclusive to BM Store orders.
 * Idempotent: the sparse unique {order} index guarantees a single record, and
 * an already-AVAILABLE record is never credited twice. Legacy PENDING records
 * (created by an earlier order workflow) are upgraded to AVAILABLE here.
 */
async function creditCommission(order) {
  if (!order.referredBy || !order.marketer || order.store) return false
  const amount = Math.round(order.subtotal * (COMMISSION_RATE / 100) * 100) / 100
  if (amount <= 0) return false

  const pre = await Commission.findOne({ order: order._id }).lean()
  if (pre?.status === 'AVAILABLE') return true

  try {
    await Commission.findOneAndUpdate(
      { order: order._id, status: { $ne: 'AVAILABLE' } },
      {
        $set: {
          status: 'AVAILABLE',
          amount,
          rate: COMMISSION_RATE,
          marketer: order.marketer,
          orderId: order.orderRef,
          availableAt: new Date(),
        },
      },
      { upsert: true }
    )
  } catch (e) {
    // A concurrent delivery won the race and already credited the AVAILABLE
    // record (unique {order} index) — nothing more to do.
    if (e.code === 11000) return true
    throw e
  }

  const profile = await MarketerProfile.findById(order.referredBy)
  if (profile) {
    profile.totalEarnings = Math.round((profile.totalEarnings + amount) * 100) / 100
    await profile.save()
  }
  return true
}

/**
 * Safe no-op for cancel/reject and order deletion: cancels any legacy PENDING
 * commission record carried over from an earlier order workflow, but never
 * creates one — commissions no longer exist before delivery.
 */
async function cancelExistingCommission(order) {
  await Commission.updateOne({ order: order._id, status: 'PENDING' }, { $set: { status: 'CANCELLED' } })
}

/**
 * Reverses the side effects of confirming/delivering an order so a hard delete
 * leaves the catalog and the marketer books consistent:
 * - orders that reached "confirmed"/"delivered" roll back confirmedSales
 *   (mirrors how confirm incremented them);
 * - delivered referral (BM Store) orders cancel the credited AVAILABLE
 *   commission and decrement the marketer's totalEarnings.
 * Safe to call on any order — pending/terminal orders have no effects.
 */
export async function reverseOrderEffects(order) {
  if (order.status === 'confirmed' || order.status === 'delivered') {
    for (const item of order.items) {
      if (!item.productId) continue
      const product = await Product.findById(item.productId).lean()
      const storeFilter = product?.store ? { store: product.store } : {}
      const inc = { confirmedSales: -item.qty }
      // Hard-deleting returns the confirmed/delivered units to stock for BM
      // Store only (seller products track no stock).
      if (product && !product.store) inc.stock = item.qty
      await Product.updateOne(
        { _id: item.productId, ...storeFilter },
        { $inc: inc }
      )
    }
  }

  const commission = order.referredBy ? await Commission.findOne({ order: order._id }).lean() : null
  if (commission) {
    if (commission.status === 'AVAILABLE') {
      const profile = await MarketerProfile.findById(order.referredBy)
      if (profile) {
        profile.totalEarnings = Math.max(0, Math.round((profile.totalEarnings - (commission.amount ?? 0)) * 100) / 100)
        await profile.save()
      }
    }
    if (commission.status !== 'CANCELLED') {
      await Commission.updateOne({ _id: commission._id }, { $set: { status: 'CANCELLED' } })
    }
  }
}

/**
 * Admin permanently deletes an order (main catalog + seller orders). Reverses
 * confirmedSales for confirmed/delivered orders and cancels any released
 * marketer commission before removing the record.
 */
export const adminDeleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return sendError(res, 'Order not found', 404)

  await reverseOrderEffects(order)
  await Order.deleteOne({ _id: order._id })
  return sendSuccess(res, null, 'Order deleted')
})

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

  const previousStatus = order.status
  const wasConfirmed = previousStatus !== 'confirmed' && status === 'confirmed'
  const wasDelivered = previousStatus !== 'delivered' && status === 'delivered'

  // Confirming an order increments product confirmedSales and, for BM Store
  // (admin) products, decrements their stock (seller products are untouched).
  // The whole order is validated first so a shortfall never leaves a partial
  // decrement behind.
  if (wasConfirmed) {
    const items = order.items.filter((i) => i.productId)
    for (const item of items) {
      const product = await Product.findById(item.productId).lean()
      if (!product || product.store) continue
      const available = Number(product.stock) || 0
      if (item.qty > available) {
        return sendError(res, `Insufficient stock for "${item.name}" (${available} available)`, 400)
      }
    }
    for (const item of items) {
      const product = await Product.findById(item.productId).lean()
      const storeFilter = product?.store ? { store: product.store } : {}
      const inc = { confirmedSales: item.qty }
      if (product && !product.store) inc.stock = -item.qty
      await Product.updateOne(
        { _id: item.productId, ...storeFilter },
        { $inc: inc }
      )
    }
  }

  await settleRewardAndStatus(order, status)

  // Commissions are credited ONLY on delivery: a referral order earns its
  // marketer commission when the client actually receives it. Never before.
  if (wasDelivered) {
    await creditCommission(order)
  }

  if (status === 'cancelled' || status === 'rejected') {
    await cancelExistingCommission(order)
  }

  // A confirmed order that is cancelled returns its units to stock (BM Store
  // products only; seller products track no stock).
  if (status === 'cancelled' && previousStatus === 'confirmed') {
    for (const item of order.items) {
      if (!item.productId) continue
      const product = await Product.findById(item.productId).lean()
      if (product && !product.store) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
      }
    }
  }

  return sendSuccess(res, { order }, 'Order status updated')
})

/**
 * Persists the status transition and, for BM Store orders entering the
 * "confirmed" state for the first time, settles the reward discount:
 * allocates the customer's next reward order number and applies the
 * configured per-category percentages (snapshotted onto the order items).
 * Seller orders and already-numbered legacy orders are untouched.
 */
async function settleRewardAndStatus(order, status) {
  order.status = status

  // Only entering "confirmed" allocates a reward number/discount. Pending,
  // rejected and cancelled transitions never increase the purchase count.
  if (status !== 'confirmed' || order.store || order.customerOrderNumber) {
    await order.save()
    return
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextNumber = await allocateCustomerOrderNumber(order.user)
    const reward = await applyRewardToItems(order.items, nextNumber)
    order.customerOrderNumber = nextNumber
    order.discountPercent = reward.blendedPercent
    order.discountAmount = reward.discountAmount
    order.total = order.subtotal + order.delivery - reward.discountAmount
    try {
      await order.save()
      return
    } catch (e) {
      // Concurrent confirm of another order by the same customer grabbed the
      // same number — retry with the next one.
      if (e.code !== 11000) throw e
    }
  }
  throw new Error('Could not allocate reward order number, please retry')
}

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status
  if (req.query.ownerType === 'BM') query.store = null
  else if (req.query.ownerType === 'SELLER') query.store = { $ne: null }

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('marketer', 'name phone').lean(),
    Order.countDocuments(query),
  ])
  return sendSuccess(res, { orders, page, limit, total, pages: Math.ceil(total / limit) })
})