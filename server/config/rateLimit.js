import rateLimit from 'express-rate-limit'

const passThrough = (_req, _res, next) => next()

export const limitAuth =
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { success: false, message: 'Too many attempts, please try again later' },
      })
    : passThrough