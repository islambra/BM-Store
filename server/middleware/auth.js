import { verifyAccessToken, ACCESS_COOKIE } from '../utils/token.js'
import User from '../models/User.js'
import { asyncHandler, sendError } from '../utils/response.js'

export const requireAuth = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[ACCESS_COOKIE]
  if (!token) {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) token = header.slice(7)
  }
  if (!token) return sendError(res, 'Authentication required', 401)

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch {
    return sendError(res, 'Invalid or expired token', 401)
  }

  const user = await User.findById(payload.sub).select('-passwordHash').lean()
  if (!user) return sendError(res, 'Account not found', 401)

  req.user = user
  next()
})

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  let token = req.cookies?.[ACCESS_COOKIE]
  if (!token) {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) token = header.slice(7)
  }
  if (!token) return next()

  try {
    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.sub).select('-passwordHash').lean()
    if (user) req.user = user
  } catch {
    /* invalid token on a public route — treat as guest */
  }
  next()
})

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return sendError(res, 'Authentication required', 401)
  if (!roles.includes(req.user.role)) {
    return sendError(res, 'You do not have permission to perform this action', 403)
  }
  next()
}

export const requireAdmin = requireRole('ADMIN')
export const requireMarketer = requireRole('MARKETER', 'ADMIN')
