import Category from '../models/Category.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'
import { translateArabicToEnglish } from '../services/translationService.js'
import { deleteFileFromGridFS } from '../utils/gridfs.js'

const pickFields = (body) => {
  const fields = ['slug', 'name', 'nameAr', 'nameFr', 'image', 'icon', 'order', 'active']
  const out = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}

// Public — active categories only, display order, with active product counts.
export const getCategories = asyncHandler(async (_req, res) => {
  const [docs, counts] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ])
  const countByCategory = new Map(counts.map((c) => [c._id, c.count]))
  const withCounts = docs.map((c) => ({ ...c, productCount: countByCategory.get(c.slug) || 0 }))
  return sendSuccess(res, withCounts)
})

// ---- Admin (router mounts these behind requireAdmin) ----

export const adminList = asyncHandler(async (_req, res) => {
  const docs = await Category.find().sort({ order: 1, name: 1 }).lean()
  return sendSuccess(res, docs)
})

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'category'

async function uniqueSlug(name, exceptId) {
  const base = slugify(name)
  if (!exceptId && !(await Category.exists({ slug: base }))) return base
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`
    const exists = await Category.exists({ slug: candidate, _id: { $ne: exceptId } })
    if (!exists) return candidate
  }
  return `${base}-${Date.now()}`
}

export const adminCreate = asyncHandler(async (req, res) => {
  const data = pickFields(req.body)
  const arabicName = String(data.nameAr ?? data.name ?? '').trim()
  if (!arabicName) return sendError(res, 'Category name (Arabic) is required', 400)

  let englishName
  try {
    englishName = await translateArabicToEnglish(arabicName)
  } catch (err) {
    console.error('[Category] Translation failed during creation:', err.message)
    return sendError(res, 'Could not translate content. Please try again.', 502)
  }

  data.name = englishName || arabicName
  data.nameAr = arabicName
  delete data.nameFr

  if (data.slug) {
    data.slug = String(data.slug).toLowerCase().trim()
    const exists = await Category.exists({ slug: data.slug })
    if (exists) return sendError(res, 'A category with this slug already exists', 409)
  } else {
    data.slug = await uniqueSlug(data.name)
  }

  const doc = await Category.create(data)
  return sendSuccess(res, doc, 'Category created', 201)
})

export const adminUpdate = asyncHandler(async (req, res) => {
  const data = pickFields(req.body)
  if (!req.params.id) return sendError(res, 'Category id is required', 400)

  const current = await Category.findById(req.params.id)
  if (!current) return sendError(res, 'Category not found', 404)

  if (data.nameAr !== undefined && String(data.nameAr).trim() !== current.nameAr) {
    const trimmed = String(data.nameAr).trim()
    if (trimmed) {
      try {
        const englishName = await translateArabicToEnglish(trimmed)
        data.name = englishName || trimmed
        data.nameAr = trimmed
      } catch (err) {
        console.error('[Category] Translation failed during update:', err.message)
        return sendError(res, 'Could not translate content. Please try again.', 502)
      }
    }
  }

  delete data.nameFr

  if (data.slug && data.slug !== current.slug) {
    const clash = await Category.exists({ slug: String(data.slug).toLowerCase(), _id: { $ne: current._id } })
    if (clash) return sendError(res, 'A category with this slug already exists', 409)
    data.slug = String(data.slug).toLowerCase()
  }

  Object.assign(current, data)
  const updated = await current.save()
  return sendSuccess(res, updated, 'Category updated')
})

export const adminDelete = asyncHandler(async (req, res) => {
  const doc = await Category.findById(req.params.id)
  if (!doc) return sendError(res, 'Category not found', 404)

  const productsCount = await Product.countDocuments({ category: doc.slug })
  if (productsCount > 0) {
    return sendError(res, `Cannot delete category. ${productsCount} product(s) are using this category. Please move or delete them first.`, 400)
  }

  if (doc.image && /^[0-9a-fA-F]{24}$/.test(doc.image)) {
    await deleteFileFromGridFS(doc.image)
  }
  await Category.deleteOne({ _id: doc._id })
  return sendSuccess(res, null, 'Category deleted')
})