import crypto from 'node:crypto'
import Order, { ORDER_STATUSES, isValidTransition } from '../models/Order.js'
import Product from '../models/Product.js'
import Commission from '../models/Commission.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Reward, { getRewardDiscount } from '../models/Reward.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

export const FREE_DELIVERY_THRESHOLD = 2500
export const DELIVERY_FEE = 350
const COMMISSION_RATE = 10

const randomRef = () => `BM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

const isValidStatus = (s) => ORDER_STATUSES.includes(s)

export const createOrder = asyncHandler(async (req, res) => {
  const { items, customer, referralId } = req.body ?? {}

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
  const shipping = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + shipping - totalRewardDiscount

  let referredBy = null
  let commissionAmount = 0
  if (referralId) {
    const referral = await Referral.findById(referralId).lean()
    if (referral) {
      const profile = await MarketerProfile.findOne({ user: referral.marketer, status: 'active' }).lean()
      if (profile) {
        referredBy = profile._id
        commissionAmount = Math.round(subtotal * (COMMISSION_RATE / 100) * 100) / 100
      }
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
    referralAttributed: Boolean(referredBy),
    commissionAmount,
  })

  return sendSuccess(res, { order }, 'Order request received', 201)
})

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
  return sendSuccess(res, { orders })
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

  const wasConfirmed = order.status !== 'confirmed' && status === 'confirmed'

  order.status = status
  await order.save()

  if (wasConfirmed) {
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, confirmedSales: item.qty } })
      }
    }

    if (order.commissionAmount > 0 && order.referredBy) {
      const profile = await MarketerProfile.findById(order.referredBy)
      if (profile) {
        await Commission.create({
          marketer: profile.user,
          order: order._id,
          orderId: order.orderRef,
          rate: COMMISSION_RATE,
          amount: order.commissionAmount,
          status: 'PENDING',
        })
        profile.totalEarnings += order.commissionAmount
        await profile.save()
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

  return sendSuccess(res, { order }, 'Order status updated')
})

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.status) query.status = req.query.status

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(query),
  ])
  return sendSuccess(res, { orders, page, limit, total, pages: Math.ceil(total / limit) })
})
