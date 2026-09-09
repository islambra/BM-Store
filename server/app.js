import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { sendError } from './utils/response.js'
import { getBucket, findGridFSFile } from './utils/gridfs.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
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
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/marketer', marketerRoutes)
app.use('/api/marketing', marketingRoutes)
app.use('/api/admin/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)

app.use((_req, res) => sendError(res, 'Route not found', 404))

app.use((err, _req, res, _next) => {
  if (err?.code === 11000) {
    return sendError(res, 'A record with this value already exists', 409)
  }
  console.error('[Server error]', err.stack ?? err)
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
