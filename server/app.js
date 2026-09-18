import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { sendError, sendSuccess } from './utils/response.js'
import { getBucket, findGridFSFile } from './utils/gridfs.js'
import { DELIVERY_FEE } from './controllers/order.controller.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import productRoutes from './routes/product.routes.js'
import categoryRoutes from './routes/category.routes.js'
import bannerRoutes from './routes/banner.routes.js'
import orderRoutes from './routes/order.routes.js'
import marketerRoutes from './routes/marketer.routes.js'
import marketingRoutes from './routes/marketing.routes.js'
import adminRoutes from './routes/admin.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import postRoutes from './routes/post.routes.js'
import commentRoutes from './routes/comments.routes.js'
import sellerRoutes from './routes/seller.routes.js'
import storeRoutes from './routes/store.routes.js'
import publicStoreRoutes from './routes/public.store.routes.js'
import rewardRoutes from './routes/reward.routes.js'
import adminSellerRoutes from './routes/admin.seller.routes.js'
import wilayaRoutes from './routes/wilaya.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Base domain under which seller stores are served as subdomains, e.g.
// "localhost" in development or "bmstore.com" in production.
const storeBaseDomain = (process.env.STORE_BASE_DOMAIN || '').trim().toLowerCase().replace(/^www\./, '') || 'localhost'

const originAllowed = (origin) => {
  if (!origin) return true
  let host = ''
  try {
    host = new URL(origin).hostname.toLowerCase()
  } catch {
    return false
  }
  return allowedOrigins.includes(origin) || (host !== storeBaseDomain && host.endsWith(`.${storeBaseDomain}`))
}

app.use(
  cors({
    origin: (origin, callback) => callback(null, originAllowed(origin)),
    credentials: true,
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/uploads/:id', async (req, res, next) => {
  try {
    let id
    try {
      id = new mongoose.Types.ObjectId(req.params.id)
    } catch {
      return next()
    }
    const file = await findGridFSFile(id)
    if (!file) return next()
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream')
    res.setHeader('Content-Length', file.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    getBucket().openDownloadStream(id).pipe(res)
  } catch (err) {
    console.error('[Image fetch failed]', err.message)
    return next()
  }
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api', healthRoutes)
app.get('/api/config', (_req, res) => sendSuccess(res, { deliveryFee: DELIVERY_FEE }))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/wilayas', wilayaRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/marketer', marketerRoutes)
app.use('/api/marketing', marketingRoutes)
app.use('/api/admin/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/seller', adminSellerRoutes)
app.use('/api/seller', sellerRoutes)
app.use('/api/store', storeRoutes)
app.use('/api/stores', publicStoreRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)

app.use((_req, res) => sendError(res, 'Route not found', 404))

app.use((err, _req, res, _next) => {
  if (err?.code === 11000) {
    const field = Object.keys(err?.keyPattern ?? {})[0]
    const message =
      field === 'phone'
        ? 'An account with this phone number already exists'
        : field === 'referralCode'
          ? 'That referral code is already in use'
          : field === 'email'
            ? 'An account with this email already exists'
            : field === 'slug'
              ? 'This store URL is already taken'
              : 'A record with this value already exists'
    return sendError(res, message, 409)
  }
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400)
  }
  if (err.name === 'ValidationError') {
    return sendError(res, err.message || 'Validation failed', 400)
  }
  console.error('[Server error]', err.stack ?? err)
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
