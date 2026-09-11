import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import Payout from '../models/Payout.js'
import Order from '../models/Order.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { referralLink, appBaseUrl } from '../utils/referral.js'
import { commissionBuckets } from '../utils/finance.js'

export async function buildMarketerStats(marketerId) {
  const [visits, customers, orders, deliveredOrders, buckets] = await Promise.all([
    Referral.countDocuments({ marketer: marketerId }),
    Referral.countDocuments({ marketer: marketerId, converted: true }),
    Order.countDocuments({ marketer: marketerId }),
    Order.countDocuments({ marketer: marketerId, status: 'delivered' }),
    commissionBuckets(marketerId),
  ])
  return { visits, customers, orders, deliveredOrders, ...buckets }
}

export function profileSummary(profile, user, extra = {}) {
  return {
    id: profile._id,
    publicName: profile.publicName,
    bio: profile.bio,
    avatar: profile.avatar,
    referralCode: profile.referralCode,
    referralLink: referralLink(profile.referralCode),
    status: profile.status,
    payoutDetails: profile.payoutDetails || { ccp: '', ccpKey: '', baridiMob: '' },
    totalEarnings: profile.totalEarnings,
    createdAt: profile.createdAt,
    user: user
      ? { id: user._id, name: user.name, phone: user.phone || '', avatar: user.avatar || null }
      : undefined,
    ...extra,
  }
}

export const getMarketerProfile = asyncHandler(async (req, res) => {
  const profile = await MarketerProfile.findOne({ user: req.user._id }).lean()
  if (!profile) return sendError(res, 'Marketer profile not found', 404)
  const user = await User.findById(req.user._id).select('-passwordHash').lean()
  const stats = await buildMarketerStats(req.user._id)

  return sendSuccess(res, {
    profile: profileSummary(profile, user),
    stats,
    baseUrl: appBaseUrl(),
  })
})

export const updateMarketerProfile = asyncHandler(async (req, res) => {
  const profile = await MarketerProfile.findOne({ user: req.user._id })
  if (!profile) return sendError(res, 'Marketer profile not found', 404)
  const user = await User.findById(req.user._id)
  if (!user) return sendError(res, 'Account not found', 401)

  const { name, phone, publicName, bio, avatar, payoutDetails } = req.body ?? {}

  if (name !== undefined) user.name = String(name).trim() || user.name
  if (phone !== undefined) {
    const phoneKey = String(phone).trim().replace(/[^+\d\s-]/g, '').replace(/[\s-]+/g, '')
    if (!phoneKey) return sendError(res, 'Valid phone number is required', 400)
    const clash = await User.findOne({ phone: phoneKey, _id: { $ne: user._id } }).lean()
    if (clash) return sendError(res, 'An account with this phone number already exists', 409)
    user.phone = phoneKey
  }
  if (avatar !== undefined) user.avatar = String(avatar).trim() || undefined
  await user.save()

  if (publicName !== undefined) profile.publicName = String(publicName).trim()
  if (bio !== undefined) profile.bio = String(bio).trim()
  if (avatar !== undefined) profile.avatar = String(avatar).trim() || undefined
  if (payoutDetails !== undefined) {
    if (payoutDetails.ccp !== undefined) profile.payoutDetails.ccp = String(payoutDetails.ccp).trim()
    if (payoutDetails.ccpKey !== undefined) profile.payoutDetails.ccpKey = String(payoutDetails.ccpKey).trim()
    if (payoutDetails.baridiMob !== undefined) profile.payoutDetails.baridiMob = String(payoutDetails.baridiMob).trim()
  }

  await profile.save()
  const stats = await buildMarketerStats(req.user._id)
  return sendSuccess(res, { profile: profileSummary(profile, user), stats }, 'Profile updated')
})

export const getMarketerDashboard = asyncHandler(async (req, res) => {
  const [profile, user, stats, orders, payouts] = await Promise.all([
    MarketerProfile.findOne({ user: req.user._id }).lean(),
    User.findById(req.user._id).select('-passwordHash').lean(),
    buildMarketerStats(req.user._id),
    Order.find({ marketer: req.user._id }).sort({ createdAt: -1 }).limit(5).select('orderRef status subtotal total createdAt referredBy marketer').lean(),
    Payout.find({ marketer: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ])
  if (!profile) return sendError(res, 'Marketer profile not found', 404)

  const detailedOrders = await attachCommissionStatus(req.user._id, orders)

  return sendSuccess(res, {
    profile: profileSummary(profile, user),
    stats,
    referralLink: referralLink(profile.referralCode),
    baseUrl: appBaseUrl(),
    recentOrders: detailedOrders,
    recentPayouts: payouts,
  })
})

export async function attachCommissionStatus(marketerId, orders) {
  const ids = orders.map((o) => o._id)
  const commissions = await Commission.find({ marketer: marketerId, order: { $in: ids } }).lean()
  const byOrder = new Map(commissions.map((c) => [String(c.order), c]))
  return orders.map((o) => ({
    id: o._id,
    orderRef: o.orderRef,
    status: o.status,
    // Privacy: only product names/quantities — never customer details.
    items: Array.isArray(o.items) ? o.items.map((it) => ({ name: it.name, qty: it.qty })) : [],
    subtotal: o.subtotal,
    total: o.total,
    createdAt: o.createdAt,
    commission:
      byOrder.get(String(o._id)) || null,
  }))
}

export const getMarketerOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = { marketer: req.user._id }
  if (req.query.status) query.status = req.query.status

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('orderRef status items subtotal discountPercent discountAmount delivery total createdAt referredBy marketer')
      .lean(),
    Order.countDocuments(query),
  ])

  const items = await attachCommissionStatus(req.user._id, orders)
  return sendSuccess(res, { orders: items, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getMarketerEarnings = asyncHandler(async (req, res) => {
  const [commissions, buckets] = await Promise.all([
    Commission.find({ marketer: req.user._id })
      .populate('order', 'orderRef total createdAt')
      .select('-marketer')
      .sort({ createdAt: -1 })
      .lean(),
    commissionBuckets(req.user._id),
  ])

  return sendSuccess(res, { commissions, buckets })
})

export const getMarketerPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ marketer: req.user._id })
    .sort({ createdAt: -1 })
    .select('amount method reference status notes commissions createdAt sentAt confirmedAt disputedAt cancelledAt')
    .lean()
  return sendSuccess(res, { payouts })
})

const isOwnerOrAdmin = (req, payout) =>
  String(payout.marketer) === String(req.user._id) || req.user.role === 'ADMIN'

export const confirmPayoutReceived = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id)
  if (!payout) return sendError(res, 'Payout not found', 404)
  if (!isOwnerOrAdmin(req, payout)) {
    return sendError(res, 'You do not have permission to perform this action', 403)
  }

  if (payout.status !== 'sent') {
    return sendError(res, `Cannot confirm a payout in status "${payout.status}"`, 400)
  }

  payout.status = 'received'
  payout.confirmedAt = new Date()
  await payout.save()

  if (payout.commissions?.length) {
    await Commission.updateMany(
      { _id: { $in: payout.commissions }, status: 'PAYMENT_SENT' },
      { $set: { status: 'RECEIVED', paidAt: new Date() } }
    )
  }

  return sendSuccess(res, { payout }, 'Payout confirmed')
})

export const reportPayoutNotReceived = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id)
  if (!payout) return sendError(res, 'Payout not found', 404)
  if (!isOwnerOrAdmin(req, payout)) {
    return sendError(res, 'You do not have permission to perform this action', 403)
  }

  if (payout.status !== 'sent') {
    return sendError(res, `Cannot report a payout in status "${payout.status}"`, 400)
  }

  payout.status = 'disputed'
  payout.disputedAt = new Date()
  await payout.save()

  if (payout.commissions?.length) {
    await Commission.updateMany(
      { _id: { $in: payout.commissions }, status: 'PAYMENT_SENT' },
      { $set: { status: 'DISPUTED' } }
    )
  }

  return sendSuccess(res, { payout }, 'Payout dispute recorded')
})