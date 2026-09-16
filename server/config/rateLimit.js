import rateLimit from 'express-rate-limit'

const passThrough = (_req, _res, next) => next()

// Rate limiters are enforced in production only; in development/tests they are
// inactive so long test runs and local workflows are not throttled.
const productionLimiter = (options) =>
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { success: false, message: 'Too many attempts, please try again later' },
        ...options,
      })
    : passThrough

// Brute-force protection for credential-based endpoints (register/login).
export const limitAuth = productionLimiter({ limit: 30 })

// Public, write-heavy endpoint (referral visit tracking). Slows down
// DB-bloat spam since every tracked (visitor) creates a Referral document.
export const limitTracking = productionLimiter({ limit: 180 })