import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
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
import { generateReferralCode, referralLink } from '../utils/referral.js'

const safeUser = (u) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.avatar || null,
  phone: u.phone || null,
  createdAt: u.createdAt,
})

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body

  if (!name?.trim() || !email?.trim() || !password) {
    return sendError(res, 'Name, email and password are required', 400)
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400)
  }

  const exists = await User.findOne({ email: String(email).toLowerCase() }).lean()
  if (exists) return sendError(res, 'An account with this email already exists', 409)

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name: name.trim(), email, passwordHash, role: 'USER', phone: phone || undefined })

  setAuthCookies(res, user)
  return sendSuccess(res, { user: safeUser(user) }, 'Account created', 201)
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email?.trim() || !password) return sendError(res, 'Email and password are required', 400)

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash').lean(true)
  if (!user || !user.passwordHash) return sendError(res, 'Invalid email or password', 401)

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return sendError(res, 'Invalid email or password', 401)

  setAuthCookies(res, user)
  return sendSuccess(res, { user: safeUser(user) }, 'Logged in')
})

export const logout = (_req, res) => {
  clearAuthCookies(res)
  return sendSuccess(res, null, 'Logged out')
}

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE]
  if (!refreshToken) return sendError(res, 'Authentication required', 401)

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return sendError(res, 'Session expired, please log in again', 401)
  }

  const user = await User.findById(payload.sub).select('-passwordHash').lean()
  if (!user) return sendError(res, 'Account not found', 401)

  res.cookie(ACCESS_COOKIE, signAccessToken(user), accessCookieOptions)
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions)
  return sendSuccess(res, { user: safeUser(user) })
})

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash').lean()
  if (!user) return sendError(res, 'Account not found', 401)
  return sendSuccess(res, { user: safeUser(user) })
})

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) return sendError(res, 'Account not found', 401)

  const { name, email, phone, avatar } = req.body ?? {}
  if (name !== undefined) user.name = String(name).trim()
  if (phone !== undefined) user.phone = String(phone).trim() || undefined
  if (avatar !== undefined) user.avatar = String(avatar).trim() || undefined
  if (email !== undefined) {
    const nextEmail = String(email).toLowerCase().trim()
    if (!nextEmail) return sendError(res, 'Email is required', 400)
    const clash = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).lean()
    if (clash) return sendError(res, 'An account with this email already exists', 409)
    user.email = nextEmail
  }

  await user.save()
  return sendSuccess(res, { user: safeUser(user) }, 'Profile updated')
})

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
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
  await user.save()
  return sendSuccess(res, null, 'Password updated')
})

export const becomeMarketer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) return sendError(res, 'Account not found', 401)

  if (user.role === 'MARKETER') {
    const existing = await MarketerProfile.findOne({ user: user._id }).lean()
    if (existing) {
      return sendSuccess(res, {
        user: safeUser(user),
        marketer: {
          referralCode: existing.referralCode,
          referralLink: referralLink(existing.referralCode),
          publicName: existing.publicName,
          status: existing.status,
        },
      }, 'You are already a marketer')
    }
  }

  user.role = 'MARKETER'
  await user.save()

  let profile = await MarketerProfile.findOne({ user: user._id })
  if (!profile) {
    let code = generateReferralCode()
    while (await MarketerProfile.exists({ referralCode: code })) code = generateReferralCode()
    profile = await MarketerProfile.create({
      user: user._id,
      publicName: user.name,
      referralCode: code,
    })
  }

  return sendSuccess(
    res,
    {
      user: safeUser(user),
      marketer: {
        referralCode: profile.referralCode,
        referralLink: referralLink(profile.referralCode),
        publicName: profile.publicName,
        status: profile.status,
      },
    },
    'Welcome to the marketer program',
    201
  )
})
