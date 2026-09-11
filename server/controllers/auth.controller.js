import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
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
  role: u.role,
  avatar: u.avatar || null,
  phone: u.phone || null,
  createdAt: u.createdAt,
})

const normalizePhone = (value) => String(value ?? '').trim().replace(/[^+\d\s-]/g, '').replace(/[\s-]+/g, '')

async function linkReferralToUser(referralId, userId, visitorId) {
  if (!referralId) return null
  const query = { _id: referralId, active: true }
  // When the registering browser identifies its visitor id, the referral must
  // belong to that visitor (or already be linked to this account) — someone
  // else's referral cannot be attached to a new account.
  if (visitorId) query.$or = [{ visitor: visitorId }, { customer: userId }]
  const ref = await Referral.findOne(query)
  if (!ref) return null
  if (!ref.expiresAt || ref.expiresAt.getTime() <= Date.now()) return null

  ref.customer = userId
  ref.converted = true
  ref.convertedAt = new Date()
  await ref.save()

  if (ref.visitor) {
    await Referral.updateMany(
      { visitor: ref.visitor, active: true, expiresAt: { $gt: new Date() }, _id: { $ne: ref._id } },
      { $set: { active: false } }
    )
  }
  return ref
}

export const register = asyncHandler(async (req, res) => {
  const { name, phone, password, referralId, visitorId } = req.body

  if (!name?.trim() || !phone?.trim() || !password) {
    return sendError(res, 'Name, phone number and password are required', 400)
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400)
  }

  const phoneKey = normalizePhone(phone)
  if (!phoneKey) return sendError(res, 'Valid phone number is required', 400)
  const clash = await User.findOne({ phone: phoneKey }).lean()
  if (clash) return sendError(res, 'An account with this phone number already exists', 409)

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name: name.trim(),
    phone: phoneKey,
    passwordHash,
    role: 'USER',
  })

  setAuthCookies(res, user)
  await linkReferralToUser(referralId, user._id, visitorId)
  return sendSuccess(res, { user: safeUser(user) }, 'Account created', 201)
})

export const login = asyncHandler(async (req, res) => {
  const identifier = String(req.body.phone ?? req.body.identifier ?? '').trim()
  const { password } = req.body
  if (!identifier || !password) return sendError(res, 'Phone number and password are required', 400)

  const phoneKey = normalizePhone(identifier)
  const user = await User.findOne({ phone: phoneKey }).select('+passwordHash').lean(true)
  if (!user || !user.passwordHash) return sendError(res, 'Invalid phone or password', 401)

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return sendError(res, 'Invalid phone or password', 401)

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

  const { name, phone, avatar } = req.body ?? {}
  if (name !== undefined) user.name = String(name).trim()
  if (phone !== undefined) {
    const phoneKey = normalizePhone(phone)
    if (!phoneKey) return sendError(res, 'Valid phone number is required', 400)
    const clash = await User.findOne({ phone: phoneKey, _id: { $ne: user._id } }).lean()
    if (clash) return sendError(res, 'An account with this phone number already exists', 409)
    user.phone = phoneKey
  }
  if (avatar !== undefined) user.avatar = String(avatar).trim() || undefined

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

export const registerMarketer = asyncHandler(async (req, res) => {
  const { name, phone, password, bio, avatar, baridiMob, ccp, ccpKey } = req.body ?? {}

  if (!name?.trim() || !phone?.trim() || !password) {
    return sendError(res, 'Full name, phone number and password are required', 400)
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400)
  }

  const phoneKey = normalizePhone(phone)
  if (!phoneKey) {
    return sendError(res, 'Valid phone number is required', 400)
  }

  const existing = await User.findOne({ phone: phoneKey }).lean()
  if (existing) {
    if (existing.role === 'MARKETER') {
      let profile = await MarketerProfile.findOne({ user: existing._id }).lean()
      if (!profile) {
        let code = generateReferralCode()
        while (await MarketerProfile.exists({ referralCode: code })) code = generateReferralCode()
        profile = await MarketerProfile.create({
          user: existing._id,
          publicName: existing.name,
          referralCode: code,
          avatar: String(avatar ?? '').trim() || undefined,
          bio: String(bio ?? '').trim() || undefined,
          payoutDetails: {
            ccp: String(ccp ?? '').trim() || undefined,
            baridiMob: String(baridiMob ?? '').trim() || undefined,
            ccpKey: String(ccpKey ?? '').trim() || undefined,
          },
        })
      }
      setAuthCookies(res, existing)
      return sendSuccess(
        res,
        {
          user: safeUser(existing),
          marketer: {
            referralCode: profile.referralCode,
            referralLink: referralLink(profile.referralCode),
            publicName: profile.publicName,
            status: profile.status,
          },
        },
        'Welcome back to the marketer program'
      )
    }
    return sendError(res, 'An account with this phone number already exists', 409)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name: name.trim(),
    phone: phoneKey,
    passwordHash,
    role: 'MARKETER',
  })

  let code = generateReferralCode()
  while (await MarketerProfile.exists({ referralCode: code })) code = generateReferralCode()

  const profile = await MarketerProfile.create({
    user: user._id,
    publicName: user.name,
    referralCode: code,
    avatar: String(avatar ?? '').trim() || undefined,
    bio: String(bio ?? '').trim() || undefined,
    payoutDetails: {
      ccp: String(ccp ?? '').trim() || undefined,
      baridiMob: String(baridiMob ?? '').trim() || undefined,
      ccpKey: String(ccpKey ?? '').trim() || undefined,
    },
  })

  setAuthCookies(res, user)
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
