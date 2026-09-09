import User from '../models/User.js'
import Product from '../models/Product.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import Payout from '../models/Payout.js'
import Order from '../models/Order.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const query = {}
  if (req.query.role) query.role = req.query.role
  else query.role = { $ne: 'ADMIN' }
  if (req.query.q) {
    query.$or = [
      { name: { $regex: req.query.q, $options: 'i' } },
      { email: { $regex: req.query.q, $options: 'i' } },
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
      const [visits, commissionSums] = await Promise.all([
        profile ? Referral.countDocuments({ marketer: u._id }) : 0,
        profile
          ? Commission.aggregate([
              { $match: { marketer: u._id } },
              { $group: { _id: '$status', total: { $sum: '$amount' } } },
            ])
          : [],
      ])
      const commission = commissionSums.reduce((acc, c) => {
        acc[c._id.toLowerCase()] = c.total
        return acc
      }, {})

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        createdAt: u.createdAt,
        profile: profile
          ? {
              _id: profile._id,
              user: profile.user,
              referralCode: profile.referralCode,
              status: profile.status,
              publicName: profile.publicName,
              totalEarnings: profile.totalEarnings,
              payoutDetails: profile.payoutDetails,
            }
          : null,
        stats: { visits, commission },
      }
    })
  )

  return sendSuccess(res, { marketers: items })
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

export const recordPayout = asyncHandler(async (req, res) => {
  const { marketerId, amount, period, method, reference } = req.body ?? {}
  if (!marketerId || !amount || !period || !method) {
    return sendError(res, 'marketerId, amount, period and method are required', 400)
  }
  if (!['CCP', 'BaridiMob'].includes(method)) {
    return sendError(res, 'method must be CCP or BaridiMob', 400)
  }

  const user = await User.findById(marketerId)
  if (!user || user.role !== 'MARKETER') return sendError(res, 'Marketer not found', 400)

  const payout = await Payout.create({
    marketer: marketerId,
    amount: Number(amount),
    period,
    method,
    reference: reference || undefined,
    recordedBy: req.user._id,
    status: 'completed',
  })

  return sendSuccess(res, payout, 'Payout recorded', 201)
})

export const getPayouts = asyncHandler(async (req, res) => {
  const query = {}
  if (req.query.marketer) query.marketer = req.query.marketer
  if (req.query.period) query.period = req.query.period

  const payouts = await Payout.find(query)
    .populate('marketer', 'name email')
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
