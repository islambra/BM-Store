import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in server/.env')
}

export const ACCESS_COOKIE = 'bm_access'
export const REFRESH_COOKIE = 'bm_refresh'

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id ?? user.id), role: user.role }, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id ?? user.id), role: user.role, v: user.refreshVersion ?? 0 },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET)
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET)
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction(),
  path: '/',
  maxAge: 15 * 60 * 1000,
}

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction(),
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

export function setAuthCookies(res, user) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), accessCookieOptions)
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions)
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions, maxAge: 0 })
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 })
}