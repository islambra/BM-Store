import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import Payout from '../models/Payout.js'
import Order from '../models/Order.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { appBaseUrl } from '../utils/referral.js'
import { commissionBuckets } from '../utils/finance.js'
import {
  buildMarketerStats,
  profileSummary,
  attachCommissionStatus,
} from './marketer.controller.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.role) query.role = req.query.role
  else query.role = { $nin: ['ADMIN', 'SELLER'] }
  if (req.query.q) {
    const safe = escapeRegex(req.query.q.trim())
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { phone: { $regex: safe, $options: 'i' } },
    ]
  }

  const [users, total, orderStats] = await Promise.all([
    User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
    ]),
  ])

  const statByUser = new Map(orderStats.map((s) => [String(s._id), s]))
  const withStats = users.map((u) => {
    const stats = statByUser.get(String(u._id)) || { orderCount: 0, totalSpent: 0 }
    return { ...u, orderCount: stats.orderCount, totalSpent: Math.round(stats.totalSpent) }
  })

  return sendSuccess(res, { users: withStats, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getMarketers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'MARKETER' }).select('-passwordHash').sort({ createdAt: -1 }).lean()
  const ids = users.map((u) => u._id)

  const profiles = await MarketerProfile.find({ user: { $in: ids } }).lean()
  const profileByUser = Object.fromEntries(profiles.map((p) => [String(p.user), p]))

  const items = await Promise.all(
    users.map(async (u) => {
      const profile = profileByUser[String(u._id)]
      if (!profile) {
        return { id: u._id, name: u.name, phone: u.phone, avatar: u.avatar, createdAt: u.createdAt, profile: null, stats: null }
      }
      const stats = await buildMarketerStats(u._id)
      return {
        id: u._id,
        name: u.name,
        phone: u.phone,
        avatar: u.avatar,
        createdAt: u.createdAt,
        profile: {
          _id: profile._id,
          user: profile.user,
          referralCode: profile.referralCode,
          status: profile.status,
          publicName: profile.publicName,
          totalEarnings: profile.totalEarnings,
          payoutDetails: profile.payoutDetails,
        },
        stats,
      }
    })
  )

  return sendSuccess(res, { marketers: items })
})

export const getMarketerDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash').lean()
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 404)

  const profile = await MarketerProfile.findOne({ user: user._id }).lean()
  if (!profile) return sendError(res, 'Marketer profile not found', 404)

  const [stats, payouts, accruals] = await Promise.all([
    buildMarketerStats(user._id),
    Payout.find({ marketer: user._id }).sort({ createdAt: -1 }).select('-recordedBy').lean(),
    Commission.countDocuments({ marketer: user._id }),
  ])

  return sendSuccess(res, {
    profile: profileSummary(profile, user),
    stats,
    commissionsCount: accruals,
    payouts,
    referralLink: `${appBaseUrl()}/?ref=${profile.referralCode}`,
  })
})

export const getMarketerOrders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('_id role').lean()
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 404)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = { marketer: user._id }
  if (req.query.status) query.status = req.query.status

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('orderRef status items subtotal discountPercent discountAmount delivery total createdAt referredBy')
      .lean(),
    Order.countDocuments(query),
  ])

  const items = await attachCommissionStatus(user._id, orders)
  return sendSuccess(res, { orders: items, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getMarketerCommissions = asyncHandler(async (req, res) => {
  const marketer = req.params.id
  const user = await User.findById(marketer).select('_id role').lean()
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 404)

  const commissions = await Commission.find({ marketer })
    .populate('order', 'orderRef total createdAt')
    .select('-marketer')
    .sort({ createdAt: -1 })
    .lean()

  return sendSuccess(res, { commissions })
})

export const getMarketerReferrals = asyncHandler(async (req, res) => {
  const marketer = req.params.id
  const user = await User.findById(marketer).select('_id role').lean()
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 404)

  const referrals = await Referral.find({ marketer })
    .populate('customer', 'name')
    .select('-__v')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()

  return sendSuccess(res, { referrals })
})

export const getMarketerPayouts = asyncHandler(async (req, res) => {
  const marketer = req.params.id
  const user = await User.findById(marketer).select('_id role').lean()
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 404)

  const payouts = await Payout.find({ marketer })
    .sort({ createdAt: -1 })
    .select('-recordedBy')
    .lean()

  return sendSuccess(res, { payouts })
})

export const updateMarketerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (status !== 'active' && status !== 'suspended') {
    return sendError(res, 'status must be active or suspended', 400)
  }
  const profile = await MarketerProfile.findById(req.params.id)
  if (!profile) return sendError(res, 'Marketer profile not found', 404)

  profile.status = status
  await profile.save()
  return sendSuccess(res, profile, 'Marketer status updated')
})

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Finds any subset of `amounts` that sums exactly to `target`. Returns indices
// or null. Realistic commission lists are small (dozens), so a pruned
// backtracking search (largest values first, skip over-target) is fast; the
// node budget guards against pathological inputs.
function findExactSubset(amounts, target) {
  let nodes = 0
  const search = (start, remaining, chosen) => {
    nodes += 1
    if (nodes > 200000) return null
    if (remaining === 0) return chosen
    for (let i = start; i < amounts.length; i += 1) {
      const a = amounts[i]
      if (a > remaining) continue
      chosen.push(i)
      const result = search(i + 1, Math.round((remaining - a) * 100) / 100, chosen)
      if (result) return result
      chosen.pop()
    }
    return null
  }
  return search(0, target, [])
}

export const recordPayout = asyncHandler(async (req, res) => {
  const { marketerId, amount, method, reference, notes } = req.body ?? {}
  if (!marketerId || !amount || !method) {
    return sendError(res, 'marketerId, amount and method are required', 400)
  }
  if (!['CCP', 'BaridiMob'].includes(method)) {
    return sendError(res, 'method must be CCP or BaridiMob', 400)
  }

  const user = await User.findById(marketerId)
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 400)

  const amt = round2(amount)
  if (!Number.isFinite(amt) || amt <= 0) return sendError(res, 'Invalid payout amount', 400)

  const available = (await commissionBuckets(marketerId)).availableBalance
  if (amt > available) {
    return sendError(res, `Amount exceeds the marketer's available balance (${available})`, 400)
  }

  const commissions = await Commission.find({ marketer: marketerId, status: 'AVAILABLE' })
    .sort({ availableAt: 1, createdAt: 1 })
    .select('_id amount availableAt')
    .lean()

  const now = new Date()
  const setSent = (id) =>
    Commission.findOneAndUpdate(
      { _id: id, marketer: marketerId, status: 'AVAILABLE' },
      { $set: { status: 'PAYMENT_SENT', paidAt: now } },
      { new: true }
    )
  const restore = (ids) =>
    ids.length
      ? Commission.updateMany(
          { _id: { $in: ids }, status: 'PAYMENT_SENT' },
          { $set: { status: 'AVAILABLE', paidAt: null } }
        )
      : Promise.resolve()

  let claimed = []
  let remaining = amt

  // Claim whole commissions that fit, oldest first. Each claim is an atomic
  // conditional update, so two concurrent payouts can never double-claim.
  for (const c of commissions) {
    if (remaining <= 0) break
    const cAmount = round2(c.amount)
    if (cAmount > remaining) continue
    if (await setSent(c._id)) {
      claimed.push(c._id)
      remaining = round2(remaining - cAmount)
    }
  }

  if (remaining > 0) {
    // Greedy can dead-end (e.g. commissions [200, 400], payout 400). Roll back
    // and look for any exact subset that sums to the payout amount, preferring
    // a full match over a 409 that can never succeed.
    await restore(claimed)
    claimed = []
    const sorted = commissions
      .map((c, idx) => ({ amount: round2(c.amount), idx }))
      .sort((a, b) => b.amount - a.amount)
    const match = findExactSubset(
      sorted.map((e) => e.amount),
      amt
    )
    if (match) {
      const ids = match.map((i) => commissions[sorted[i].idx]._id)
      const ok = []
      for (const id of ids) if (await setSent(id)) ok.push(id)
      if (ok.length === ids.length) {
        claimed = ok
        remaining = 0
      } else {
        await restore(ok)
      }
    }
  }

  if (remaining > 0) {
    const exactHit = commissions.some((c) => round2(c.amount) === amt)
    if (!exactHit) {
      return sendError(res, 'Payout amount must exactly match one or more available commissions', 400)
    }
    return sendError(res, 'Unable to claim commissions; please retry', 409)
  }

  const payout = await Payout.create({
    marketer: marketerId,
    amount: amt,
    method,
    reference: reference || undefined,
    notes: notes || undefined,
    commissions: claimed,
    recordedBy: req.user._id,
    status: 'sent',
    sentAt: now,
  })

  return sendSuccess(res, payout, 'Payout sent', 201)
})

export const updatePayoutStatus = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id)
  if (!payout) return sendError(res, 'Payout not found', 404)

  const { action } = req.body ?? {}
  if (action !== 'cancel') {
    return sendError(res, 'action must be "cancel"', 400)
  }
  if (payout.status !== 'sent' && payout.status !== 'disputed') {
    return sendError(res, `Cannot cancel a payout in status "${payout.status}"`, 400)
  }

  payout.status = 'cancelled'
  payout.cancelledAt = new Date()
  await payout.save()

  if (payout.commissions?.length) {
    await Commission.updateMany(
      { _id: { $in: payout.commissions }, status: { $in: ['PAYMENT_SENT', 'DISPUTED'] } },
      { $set: { status: 'AVAILABLE', paidAt: null } }
    )
  }

  return sendSuccess(res, payout, 'Payout cancelled and balance restored')
})

export const getPayouts = asyncHandler(async (req, res) => {
  const query = {}
  if (req.query.marketer) query.marketer = req.query.marketer
  if (req.query.status) query.status = req.query.status

  const payouts = await Payout.find(query)
    .populate('marketer', 'name phone')
    .sort({ createdAt: -1 })
    .lean()

  return sendSuccess(res, { payouts })
})

export const adminDeleteMarketer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return sendError(res, 'User not found', 404)
  if (user.role !== 'MARKETER') return sendError(res, 'User is not a marketer', 400)
  if (String(user._id) === String(req.user._id)) {
    return sendError(res, 'You cannot delete your own account', 400)
  }

  await Promise.all([
    MarketerProfile.deleteMany({ user: user._id }),
    Referral.deleteMany({ marketer: user._id }),
    Commission.deleteMany({ marketer: user._id }),
    Payout.deleteMany({ marketer: user._id }),
    User.deleteOne({ _id: user._id }),
  ])

  return sendSuccess(res, { id: String(user._id) }, 'Marketer deleted with all related data')
})

export const adminDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return sendError(res, 'User not found', 404)
  if (user.role === 'ADMIN') return sendError(res, 'Cannot delete admin user', 400)
  if (String(user._id) === String(req.user._id)) {
    return sendError(res, 'You cannot delete your own account', 400)
  }

  await Promise.all([
    MarketerProfile.deleteMany({ user: user._id }),
    Referral.deleteMany({ marketer: user._id }),
    Commission.deleteMany({ marketer: user._id }),
    Payout.deleteMany({ marketer: user._id }),
    User.deleteOne({ _id: user._id }),
  ])

  return sendSuccess(res, { id: String(user._id) }, 'User deleted with all related data')
})