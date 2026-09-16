import HeroBanner, { MAX_ACTIVE_BANNERS } from '../models/HeroBanner.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { deleteGridFSByUrl } from '../utils/gridfs.js'

const pickFields = (body) => {
  const fields = [
    'image', 'link', 'active', 'order',
    'badgeEn', 'titleEn', 'subtitleEn', 'ctaEn',
    'badgeFr', 'titleFr', 'subtitleFr', 'ctaFr',
    'badgeAr', 'titleAr', 'subtitleAr', 'ctaAr',
  ]
  const out = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}

const activeCount = () => HeroBanner.countDocuments({ active: true })

// Public — active banners only, image-only payload, in display order. Max 5 by server enforcement.
export const getBanners = asyncHandler(async (_req, res) => {
  const docs = await HeroBanner.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean()
  const publicBanners = docs.map((b) => ({ _id: b._id, image: b.image, link: b.link || null, order: b.order ?? 0 }))
  return sendSuccess(res, publicBanners)
})

async function assertCanActivate(excludingId) {
  const count = excludingId
    ? await HeroBanner.countDocuments({ active: true, _id: { $ne: excludingId } })
    : await activeCount()
  if (count >= MAX_ACTIVE_BANNERS) {
    return `Maximum ${MAX_ACTIVE_BANNERS} active banners. Deactivate one before activating another.`
  }
  return null
}

// ---- Admin ----

export const adminList = asyncHandler(async (_req, res) => {
  const docs = await HeroBanner.find().sort({ order: 1, createdAt: 1 }).lean()
  return sendSuccess(res, { banners: docs, activeCount: docs.filter((b) => b.active).length, max: MAX_ACTIVE_BANNERS })
})

export const adminCreate = asyncHandler(async (req, res) => {
  const data = pickFields(req.body)
  if (!data.image) return sendError(res, 'image is required', 400)

  if (data.active === true) {
    const reason = await assertCanActivate()
    if (reason) return sendError(res, reason, 400)
    data.order = data.order ?? (await activeCount()) + 1
  } else if (data.order === undefined) {
    data.order = (await HeroBanner.estimatedDocumentCount()) + 1
  }

  const doc = await HeroBanner.create(data)
  return sendSuccess(res, doc, 'Banner created', 201)
})

export const adminUpdate = asyncHandler(async (req, res) => {
  const current = await HeroBanner.findById(req.params.id)
  if (!current) return sendError(res, 'Banner not found', 404)

  const data = pickFields(req.body)
  if (data.active === true && !current.active) {
    const reason = await assertCanActivate(current._id)
    if (reason) return sendError(res, reason, 400)
  }

  Object.assign(current, data)
  const updated = await current.save()
  return sendSuccess(res, updated, 'Banner updated')
})

export const adminDelete = asyncHandler(async (req, res) => {
  const doc = await HeroBanner.findByIdAndDelete(req.params.id)
  if (!doc) return sendError(res, 'Banner not found', 404)
  await deleteGridFSByUrl(doc.image)
  return sendSuccess(res, null, 'Banner deleted')
})