import Post from '../models/Post.js'
import Product from '../models/Product.js'
import mongoose from 'mongoose'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

const pickFields = (body) => {
  const fields = ['textEn', 'textAr', 'mediaType', 'images', 'video', 'productId', 'status']
  const out = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}

const MAX_IMAGES = 5

// ---- Public ----

export const getPublishedPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6))

  const query = { status: 'published' }
  const [docs, total] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
      .lean(),
    Post.countDocuments(query),
  ])

  return sendSuccess(res, { posts: docs, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getPublishedPostsHome = asyncHandler(async (_req, res) => {
  const docs = await Post.find({ status: 'published' })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
    .lean()
  return sendSuccess(res, docs)
})

export const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)

  const doc = await Post.findById(id)
    .populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
    .lean()
  if (!doc) return sendError(res, 'Post not found', 404)
  return sendSuccess(res, doc)
})

// ---- Admin ----

export const adminListPosts = asyncHandler(async (_req, res) => {
  const docs = await Post.find()
    .sort({ createdAt: -1 })
    .populate('productId', 'name nameAr slug image price')
    .lean()
  return sendSuccess(res, { posts: docs })
})

export const adminCreatePost = asyncHandler(async (req, res) => {
  const data = pickFields(req.body)

  if (!data.productId) return sendError(res, 'Product is required', 400)
  if (!mongoose.isValidObjectId(data.productId)) return sendError(res, 'Invalid product', 400)

  const product = await Product.findById(data.productId).lean()
  if (!product) return sendError(res, 'Product not found', 404)

  if (data.mediaType === 'video') {
    data.images = []
    if (!data.video) return sendError(res, 'Video URL is required for video posts', 400)
  } else {
    data.mediaType = 'images'
    data.video = null
    if (data.images && data.images.length > MAX_IMAGES) {
      data.images = data.images.slice(0, MAX_IMAGES)
    }
  }

  const doc = await Post.create(data)
  const populated = await doc.populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
  return sendSuccess(res, populated, 'Post created', 201)
})

export const adminUpdatePost = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)

  const current = await Post.findById(id)
  if (!current) return sendError(res, 'Post not found', 404)

  const data = pickFields(req.body)

  if (data.productId) {
    if (!mongoose.isValidObjectId(data.productId)) return sendError(res, 'Invalid product', 400)
    const product = await Product.findById(data.productId).lean()
    if (!product) return sendError(res, 'Product not found', 404)
  }

  if (data.mediaType === 'video') {
    data.images = []
    if (!data.video && !current.video) return sendError(res, 'Video URL is required for video posts', 400)
  } else if (data.mediaType === 'images') {
    data.video = null
    if (data.images && data.images.length > MAX_IMAGES) {
      data.images = data.images.slice(0, MAX_IMAGES)
    }
  }

  Object.assign(current, data)
  const updated = await current.save()
  const populated = await updated.populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
  return sendSuccess(res, populated, 'Post updated')
})

export const adminDeletePost = asyncHandler(async (req, res) => {
  const doc = await Post.findByIdAndDelete(req.params.id)
  if (!doc) return sendError(res, 'Post not found', 404)
  return sendSuccess(res, null, 'Post deleted')
})

export const adminPublishPost = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)

  const doc = await Post.findById(id)
  if (!doc) return sendError(res, 'Post not found', 404)

  doc.status = doc.status === 'published' ? 'draft' : 'published'
  await doc.save()
  const populated = await doc.populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
  return sendSuccess(res, populated, doc.status === 'published' ? 'Post published' : 'Post unpublished')
})
