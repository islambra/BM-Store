import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { referralLink, appBaseUrl } from '../utils/referral.js'

export const getMarketerProfile = asyncHandler(async (req, res) => {
  const profile = await MarketerProfile.findOne({ user: req.user._id }).lean()
  if (!profile) return sendError(res, 'Marketer profile not found', 404)

  const [visits, commissions] = await Promise.all([
    Referral.countDocuments({ marketer: req.user._id }),
    Commission.find({ marketer: req.user._id }).lean(),
  ])

  const sums = commissions.reduce(
    (acc, c) => {
      const key = c.status.toLowerCase()
      acc[key] = (acc[key] || 0) + (c.amount || 0)
      return acc
    },
    {}
  )

  return sendSuccess(res, {
    profile: {
      id: profile._id,
      publicName: profile.publicName,
      bio: profile.bio,
      avatar: profile.avatar,
      referralCode: profile.referralCode,
      referralLink: referralLink(profile.referralCode),
      status: profile.status,
      payoutDetails: profile.payoutDetails || { ccp: '', baridiMob: '' },
      totalEarnings: profile.totalEarnings,
      createdAt: profile.createdAt,
    },
    stats: {
      visits,
      attributedOrders: commissions.length,
      commission: {
        pending: sums.pending || 0,
        approved: sums.approved || 0,
        paid: sums.paid || 0,
        cancelled: sums.cancelled || 0,
        total: (sums.approved || 0) + (sums.paid || 0) + (sums.pending || 0),
      },
    },
    baseUrl: appBaseUrl(),
  })
})

export const updateMarketerProfile = asyncHandler(async (req, res) => {
  const profile = await MarketerProfile.findOne({ user: req.user._id })
  if (!profile) return sendError(res, 'Marketer profile not found', 404)

  const { publicName, bio, avatar, payoutDetails } = req.body ?? {}
  if (publicName !== undefined) profile.publicName = publicName
  if (bio !== undefined) profile.bio = bio
  if (avatar !== undefined) profile.avatar = avatar
  if (payoutDetails !== undefined) {
    if (payoutDetails.ccp !== undefined) profile.payoutDetails.ccp = payoutDetails.ccp
    if (payoutDetails.baridiMob !== undefined) profile.payoutDetails.baridiMob = payoutDetails.baridiMob
  }

  const updated = await profile.save()
  return sendSuccess(res, updated, 'Profile updated')
})

export const getMarketerEarnings = asyncHandler(async (req, res) => {
  const commissions = await Commission.find({ marketer: req.user._id })
    .populate('order', 'orderRef total')
    .sort({ createdAt: -1 })
    .lean()

  return sendSuccess(res, { commissions })
})
