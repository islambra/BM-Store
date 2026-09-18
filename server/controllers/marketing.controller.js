import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { referralExpiry, generateVisitorId } from '../utils/referral.js'

const VISITOR_COOKIE = 'bm_v'

function getVisitorId(req, res) {
  const existing = String(req.body?.visitorId || req.cookies?.[VISITOR_COOKIE] || '').trim()
  if (existing && existing.length >= 8 && existing.length <= 64) return existing
  const next = generateVisitorId()
  res.cookie(VISITOR_COOKIE, next, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return next
}

/**
 * Records a referral visit (public, identity-aware).
 * Enforces "last valid referral wins" per visitor/customer and a 7-day validity window.
 */
export const trackReferralVisit = asyncHandler(async (req, res) => {
  const { referralCode, productId, path } = req.body
  if (!referralCode) return sendError(res, 'referralCode is required', 400)

  const code = String(referralCode).toUpperCase().trim()
  const profile = await MarketerProfile.findOne({ referralCode: code }).lean()
  if (!profile || profile.status === 'suspended') {
    return sendError(res, 'Invalid or inactive referral code', 404)
  }

  const self = req.user?._id && String(req.user._id) === String(profile.user)
  if (self) return sendError(res, 'You cannot use your own referral link', 400)

  let product
  if (productId) {
    product = await Product.exists({ _id: productId })
    if (!product) return sendError(res, 'Product not found', 404)
  }

  const visitor = getVisitorId(req, res)
  const identity = [{ visitor }]
  if (req.user?._id) identity.push({ customer: req.user._id })
  const identityQuery = { $or: identity }

  const now = new Date()
  const existing = await Referral.findOne({
    profile: profile._id,
    active: true,
    expiresAt: { $gt: now },
    ...identityQuery,
  }).sort({ createdAt: -1 }).select('_id expiresAt').lean()

  if (existing) {
    await Referral.updateMany(
      { ...identityQuery, active: true, expiresAt: { $gt: now }, _id: { $ne: existing._id } },
      { $set: { active: false } }
    )
    return sendSuccess(res, { referralId: existing._id, expiresAt: existing.expiresAt }, 'Visit tracked', 201)
  }

  const doc = await Referral.create({
    marketer: profile.user,
    profile: profile._id,
    referralCode: profile.referralCode,
    customer: req.user?._id || null,
    product: productId || null,
    landingPath: typeof path === 'string' && path.trim() ? path.trim().slice(0, 500) : '/',
    visitor,
    active: true,
    expiresAt: referralExpiry(),
  })

  await Referral.updateMany(
    { ...identityQuery, active: true, expiresAt: { $gt: now }, _id: { $ne: doc._id } },
    { $set: { active: false } }
  )

  return sendSuccess(res, { referralId: doc._id, expiresAt: doc.expiresAt }, 'Visit tracked', 201)
})