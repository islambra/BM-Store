import Post from '../models/Post.js'
import Product from '../models/Product.js'
import Comment from '../models/Comment.js'
import Reaction from '../models/Reaction.js'
import mongoose from 'mongoose'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { translateArabicToEnglish } from '../services/translationService.js'

const pickFields = (body) => {
  const fields = ['textEn', 'textAr', 'mediaType', 'images', 'video', 'productId', 'status']
  const out = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}

const MAX_IMAGES = 5

const toCommentPayload = (c) => {
  const author = c.author
  return {
    _id: c._id,
    postId: c.post,
    text: c.text,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    authorId: author?._id,
    author: author ? { _id: author._id, name: author.name, avatar: author.avatar } : null,
  }
}

async function enrichPosts(docs, viewerId) {
  const ids = docs.map((d) => d._id)
  if (ids.length === 0) return docs
  const [likes, comments, myLikes] = await Promise.all([
    Reaction.aggregate([
      { $match: { post: { $in: ids }, type: 'like' } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]),
    Comment.aggregate([{ $match: { post: { $in: ids } } }, { $group: { _id: '$post', count: { $sum: 1 } } }]),
    viewerId
      ? Reaction.find({ post: { $in: ids }, user: viewerId, type: 'like' }).select('post').lean()
      : Promise.resolve([]),
  ])
  const likesMap = new Map(likes.map((r) => [String(r._id), r.count]))
  const commentsMap = new Map(comments.map((r) => [String(r._id), r.count]))
  const likedSet = new Set(myLikes.map((r) => String(r.post)))
  return docs.map((d) => ({
    ...d,
    likesCount: likesMap.get(String(d._id)) ?? 0,
    commentsCount: commentsMap.get(String(d._id)) ?? 0,
    userLiked: likedSet.has(String(d._id)),
  }))
}

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

  const enriched = await enrichPosts(docs, req.user?._id)
  return sendSuccess(res, { posts: enriched, page, limit, total, pages: Math.ceil(total / limit) })
})

export const getPublishedPostsHome = asyncHandler(async (req, res) => {
  const docs = await Post.find({ status: 'published' })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
    .lean()
  const enriched = await enrichPosts(docs, req.user?._id)
  return sendSuccess(res, enriched)
})

export const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)

  const doc = await Post.findOne({ _id: id, status: 'published' })
    .populate('productId', 'name nameAr slug image price oldPrice isSpecialOffer discount')
    .lean()
  if (!doc) return sendError(res, 'Post not found', 404)
  const [enriched] = await enrichPosts([doc], req.user?._id)
  return sendSuccess(res, enriched)
})

// ---- Likes ----

export const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)
  const post = await Post.findOne({ _id: id, status: 'published' })
  if (!post) return sendError(res, 'Post not found', 404)

  try {
    await Reaction.create({ post: id, user: req.user._id, type: 'like' })
  } catch (err) {
    if (err.code !== 11000) throw err
  }
  const likesCount = await Reaction.countDocuments({ post: id, type: 'like' })
  return sendSuccess(res, { liked: true, likesCount })
})

export const unlikePost = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)
  const post = await Post.findOne({ _id: id, status: 'published' })
  if (!post) return sendError(res, 'Post not found', 404)

  await Reaction.deleteOne({ post: id, user: req.user._id, type: 'like' })
  const likesCount = await Reaction.countDocuments({ post: id, type: 'like' })
  return sendSuccess(res, { liked: false, likesCount })
})

// ---- Comments ----

export const listComments = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)
  const post = await Post.findOne({ _id: id, status: 'published' }).lean()
  if (!post) return sendError(res, 'Post not found', 404)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8))
  const [docs, total] = await Promise.all([
    Comment.find({ post: id })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean(),
    Comment.countDocuments({ post: id }),
  ])

  return sendSuccess(res, {
    comments: docs.map(toCommentPayload),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  })
})

export const createComment = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return sendError(res, 'Post not found', 404)
  const post = await Post.findOne({ _id: id, status: 'published' }).lean()
  if (!post) return sendError(res, 'Post not found', 404)

  const text = String(req.body?.text ?? '').trim()
  if (!text) return sendError(res, 'Comment text is required', 400)
  if (text.length > 1000) return sendError(res, 'Comment is too long (max 1000 characters)', 400)

  const doc = await Comment.create({ post: id, author: req.user._id, text })
  const payload = {
    _id: doc._id,
    postId: doc.post,
    text: doc.text,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    authorId: req.user._id,
    author: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
  }
  return sendSuccess(res, payload, 'Comment added', 201)
})

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  if (!mongoose.isValidObjectId(commentId)) return sendError(res, 'Comment not found', 404)
  const comment = await Comment.findById(commentId)
  if (!comment) return sendError(res, 'Comment not found', 404)
  if (String(comment.author) !== String(req.user._id)) {
    return sendError(res, 'You can only edit your own comments', 403)
  }

  const text = String(req.body?.text ?? '').trim()
  if (!text) return sendError(res, 'Comment text is required', 400)
  if (text.length > 1000) return sendError(res, 'Comment is too long (max 1000 characters)', 400)

  comment.text = text
  await comment.save()
  await comment.populate('author', 'name avatar')
  return sendSuccess(res, toCommentPayload(comment), 'Comment updated')
})

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  if (!mongoose.isValidObjectId(commentId)) return sendError(res, 'Comment not found', 404)
  const comment = await Comment.findById(commentId)
  if (!comment) return sendError(res, 'Comment not found', 404)

  const isOwner = String(comment.author) === String(req.user._id)
  const isAdmin = req.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return sendError(res, 'You can only delete your own comments', 403)

  await comment.deleteOne()
  return sendSuccess(res, null, 'Comment deleted')
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

  if (data.textAr && !data.textEn) {
    try {
      const translated = await translateArabicToEnglish(String(data.textAr).trim())
      data.textEn = translated || data.textAr
    } catch (err) {
      console.error('[Post] Translation failed during creation:', err.message)
      return sendError(res, 'Could not translate content. Please try again.', 502)
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

  if (data.textAr !== undefined && data.textAr !== current.textAr) {
    try {
      const translated = await translateArabicToEnglish(String(data.textAr).trim())
      data.textEn = translated || data.textAr
    } catch (err) {
      console.error('[Post] Translation failed during update:', err.message)
      return sendError(res, 'Could not translate content. Please try again.', 502)
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
  await Promise.all([
    Reaction.deleteMany({ post: doc._id }),
    Comment.deleteMany({ post: doc._id }),
  ])
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
