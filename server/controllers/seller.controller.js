import bcrypt from 'bcryptjs'
import Seller from '../models/Seller.js'
import User from '../models/User.js'
import Store from '../models/Store.js'
import StoreRequest from '../models/StoreRequest.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { getAdminPaymentInfo } from '../utils/paymentInfo.js'
import {
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE,
  ACCESS_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '../utils/token.js'

const safeSeller = (s) => ({
  id: s._id.toString(),
  fullName: s.fullName,
  email: s.email,
  phone: s.phone,
  status: s.status,
  createdAt: s.createdAt,
})

const normalizePhone = (value) => String(value ?? '').trim().replace(/[^+\d\s-]/g, '').replace(/[\s-]+/g, '')

export const registerSeller = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, confirmPassword } = req.body ?? {}

  if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password || !confirmPassword) {
    return sendError(res, 'All fields are required', 400)
  }
  if (password !== confirmPassword) {
    return sendError(res, 'Passwords do not match', 400)
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400)
  }

  const emailKey = String(email).toLowerCase().trim()
  const phoneKey = normalizePhone(phone)

  const [emailClash, phoneClash] = await Promise.all([
    Seller.findOne({ email: emailKey }).lean(),
    Seller.findOne({ phone: phoneKey }).lean(),
  ])

  if (emailClash) return sendError(res, 'An account with this email already exists', 409)
  if (phoneClash) return sendError(res, 'An account with this phone number already exists', 409)

  // Also check User collection for phone conflicts
  const userPhoneClash = await User.findOne({ phone: phoneKey }).lean()
  if (userPhoneClash) return sendError(res, 'An account with this phone number already exists', 409)

  const passwordHash = await bcrypt.hash(password, 10)

  // Create linked User account for authentication first: the Seller document
  // requires a `user` reference, so it must exist before the seller is saved.
  const user = await User.create({
    name: fullName.trim(),
    phone: phoneKey,
    passwordHash,
    role: 'SELLER',
  })

  const seller = await Seller.create({
    user: user._id,
    fullName: fullName.trim(),
    email: emailKey,
    phone: phoneKey,
    status: 'active',
  })

  setAuthCookies(res, user)
  return sendSuccess(res, { seller: safeSeller(seller) }, 'Seller account created', 201)
})

export const loginSeller = asyncHandler(async (req, res) => {
  const identifier = String(req.body.phone ?? req.body.email ?? req.body.identifier ?? '').trim()
  const { password } = req.body
  if (!identifier || !password) return sendError(res, 'Email/phone and password are required', 400)

  const isEmail = identifier.includes('@')
  let seller = null
  let user = null

  if (isEmail) {
    const emailKey = identifier.toLowerCase()
    seller = await Seller.findOne({ email: emailKey }).lean()
  } else {
    const phoneKey = normalizePhone(identifier)
    seller = await Seller.findOne({ phone: phoneKey }).lean()
  }

  if (!seller) return sendError(res, 'Invalid credentials', 401)

  // Find linked user
  user = await User.findOne({ phone: seller.phone }).select('+passwordHash').lean()
  if (!user || !user.passwordHash) return sendError(res, 'Invalid credentials', 401)

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return sendError(res, 'Invalid credentials', 401)

  if (seller.status === 'suspended') return sendError(res, 'Account suspended', 403)

  setAuthCookies(res, user)
  return sendSuccess(res, { seller: safeSeller(seller) }, 'Logged in')
})

export const logoutSeller = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE]
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken)
      await User.updateOne({ _id: payload.sub }, { $inc: { refreshVersion: 1 } })
    } catch {
      /* token already invalid — nothing to revoke */
    }
  }
  clearAuthCookies(res)
  return sendSuccess(res, null, 'Logged out')
})

export const refreshSeller = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE]
  if (!refreshToken) return sendError(res, 'Authentication required', 401)

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return sendError(res, 'Session expired, please log in again', 401)
  }

  const user = await User.findById(payload.sub).select('-passwordHash').lean()
  if (!user || user.role !== 'SELLER') return sendError(res, 'Account not found', 401)
  // Stale token (revoked by logout/password change or issued pre-refreshVersion).
  if ((user.refreshVersion ?? 0) !== (payload.v ?? 0)) {
    clearAuthCookies(res)
    return sendError(res, 'Session expired, please log in again', 401)
  }

  const seller = await Seller.findOne({ phone: user.phone }).lean()
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  if (seller.status === 'suspended') return sendError(res, 'Account suspended', 403)

  res.cookie(ACCESS_COOKIE, signAccessToken(user), accessCookieOptions)
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions)
  return sendSuccess(res, { seller: safeSeller(seller) })
})

export const getSellerMe = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ phone: req.user.phone }).lean()
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  // Get store info if exists
  const store = await Store.findOne({ seller: seller._id }).lean()

  return sendSuccess(res, {
    seller: safeSeller(seller),
    store: store ? {
      id: store._id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      subscriptionPlan: store.subscriptionPlan,
      subscriptionEndDate: store.subscriptionEndDate,
    } : null,
  })
})

export const updateSellerMe = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ phone: req.user.phone })
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const { fullName, email, phone } = req.body ?? {}

  if (fullName !== undefined) seller.fullName = String(fullName).trim()
  if (email !== undefined) {
    const emailKey = String(email).toLowerCase().trim()
    if (emailKey !== seller.email) {
      const clash = await Seller.findOne({ email: emailKey, _id: { $ne: seller._id } }).lean()
      if (clash) return sendError(res, 'An account with this email already exists', 409)
      seller.email = emailKey
    }
  }
  if (phone !== undefined) {
    const phoneKey = normalizePhone(phone)
    if (!phoneKey) return sendError(res, 'Valid phone number is required', 400)
    if (phoneKey !== seller.phone) {
      const [sellerClash, userClash] = await Promise.all([
        Seller.findOne({ phone: phoneKey, _id: { $ne: seller._id } }).lean(),
        User.findOne({ phone: phoneKey }).lean(),
      ])
      if (sellerClash || userClash) return sendError(res, 'An account with this phone number already exists', 409)
      seller.phone = phoneKey
      // Also update user phone
      await User.updateOne({ phone: req.user.phone }, { phone: phoneKey })
    }
  }

  await seller.save()
  return sendSuccess(res, { seller: safeSeller(seller) }, 'Profile updated')
})

export const changeSellerPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!user) return sendError(res, 'Account not found', 401)

  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current and new passwords are required', 400)
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400)
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return sendError(res, 'Current password is incorrect', 400)

  user.passwordHash = await bcrypt.hash(newPassword, 10)
  // Revoke all other sessions; reissue cookies so this session stays logged in.
  user.refreshVersion = (user.refreshVersion ?? 0) + 1
  await user.save()
  setAuthCookies(res, user)
  return sendSuccess(res, null, 'Password updated')
})

// Store Request
export const submitStoreRequest = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ phone: req.user.phone }).lean()
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  // Check if seller already has an active store request
  const existingRequest = await StoreRequest.findOne({ seller: seller._id, status: 'pending' }).lean()
  if (existingRequest) return sendError(res, 'You already have a pending store request', 400)

  // Check if seller already has an active store
  const existingStore = await Store.findOne({ seller: seller._id, status: { $in: ['active', 'pending'] } }).lean()
  if (existingStore) return sendError(res, 'You already have an active store', 400)

  const {
    storeName,
    storeDescription,
    storeLogo,
    storePhone,
    wilaya,
    city,
    slug,
    subscriptionPlan,
    paymentProof,
  } = req.body ?? {}

  if (!storeName?.trim() || !subscriptionPlan || !paymentProof?.trim() || !slug?.trim()) {
    return sendError(res, 'Store name, subscription plan, payment proof, and store URL are required', 400)
  }

  if (!['monthly', 'yearly'].includes(subscriptionPlan)) {
    return sendError(res, 'Invalid subscription plan', 400)
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug) || slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
    return sendError(res, 'Store URL can only contain lowercase letters, numbers, and hyphens', 400)
  }

  // Check reserved slugs
  const reservedSlugs = ['admin', 'login', 'register', 'dashboard', 'api', 'products', 'categories', 'orders', 'stores', 'store', 'checkout', 'cart', 'wishlist', 'search', 'marketer', 'seller', 'profile', 'settings']
  if (reservedSlugs.includes(slug)) {
    return sendError(res, 'This store URL is reserved', 400)
  }

  // Check slug uniqueness
  const slugExists = await StoreRequest.exists({ slug, status: 'pending' }) || await Store.exists({ slug })
  if (slugExists) return sendError(res, 'This store URL is already taken', 400)

  const expectedAmount = subscriptionPlan === 'monthly' ? 2500 : 25000

  const storeRequest = await StoreRequest.create({
    seller: seller._id,
    sellerName: seller.fullName,
    sellerEmail: seller.email,
    sellerPhone: seller.phone,
    storeName: storeName.trim(),
    storeDescription: storeDescription?.trim(),
    storeLogo,
    storePhone: storePhone?.trim(),
    wilaya: wilaya?.trim(),
    city: city?.trim(),
    slug: slug.toLowerCase().trim(),
    subscriptionPlan,
    expectedAmount,
    paymentProof: paymentProof.trim(),
    status: 'pending',
  })

  return sendSuccess(res, { storeRequest }, 'Store request submitted for review', 201)
})

export const getMyStoreRequest = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ phone: req.user.phone }).lean()
  if (!seller) return sendError(res, 'Seller profile not found', 401)

  const storeRequest = await StoreRequest.findOne({ seller: seller._id }).sort({ createdAt: -1 }).lean()
  if (!storeRequest) return sendSuccess(res, { storeRequest: null, paymentInfo: await getAdminPaymentInfo() })

  return sendSuccess(res, { storeRequest, paymentInfo: await getAdminPaymentInfo() })
})

export const checkSlugAvailability = asyncHandler(async (req, res) => {
  const { slug } = req.query
  if (!slug) return sendError(res, 'Slug is required', 400)

  const normalizedSlug = String(slug).toLowerCase().trim()

  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(normalizedSlug) || normalizedSlug.startsWith('-') || normalizedSlug.endsWith('-') || normalizedSlug.includes('--')) {
    return sendSuccess(res, { available: false, reason: 'Invalid format' })
  }

  const reservedSlugs = ['admin', 'login', 'register', 'dashboard', 'api', 'products', 'categories', 'orders', 'stores', 'store', 'checkout', 'cart', 'wishlist', 'search', 'marketer', 'seller', 'profile', 'settings']
  if (reservedSlugs.includes(normalizedSlug)) {
    return sendSuccess(res, { available: false, reason: 'Reserved' })
  }

  const exists = await StoreRequest.exists({ slug: normalizedSlug, status: 'pending' }) || await Store.exists({ slug: normalizedSlug })
  return sendSuccess(res, { available: !exists })
})