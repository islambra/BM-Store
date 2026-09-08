import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { referralLink } from '../utils/referral.js'

export const trackReferralVisit = asyncHandler(async (req, res) => {
  const { referralCode, productId, path } = req.body
  if (!referralCode) return sendError(res, 'referralCode is required', 400)

  const profile = await MarketerProfile.findOne({
    referralCode: String(referralCode).toUpperCase().trim(),
  }).lean()
  if (!profile || profile.status === 'suspended') {
    return sendError(res, 'Invalid or inactive referral code', 404)
  }

  let product
  if (productId) {
    product = await Product.exists({ _id: productId })
    if (!product) return sendError(res, 'Product not found', 404)
  }

  const doc = await Referral.create({
    marketer: profile.user,
    profile: profile._id,
    referralCode: profile.referralCode,
    customer: req.body.customerId || null,
    product: productId || null,
    landingPath: path || '/',
  })

  return sendSuccess(res, { referralId: doc._id }, 'Visit tracked', 201)
})
