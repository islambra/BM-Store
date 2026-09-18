import Category from '../models/Category.js'
import RewardSettings from '../models/RewardSettings.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

const cleanPercent = (value) => {
  if (value === null || typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

// ---- Public (read-only, display estimates only — server calculates truth) --

export const getPublicRewards = asyncHandler(async (_req, res) => {
  const settings = await RewardSettings.getSettings()
  if (!settings.rewardSystemEnabled) {
    return sendSuccess(res, { enabled: false, categories: [] })
  }
  const categories = await Category.find({ active: true, rewardEnabled: true })
    .sort({ order: 1, name: 1 })
    .lean()
  const visible = categories
    .filter((c) => !c.store)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      nameAr: c.nameAr,
      rewardNormalPercent: c.rewardNormalPercent,
      rewardSpecialPercent: c.rewardSpecialPercent,
    }))
  return sendSuccess(res, { enabled: true, categories: visible })
})

// ---- Admin (mounted behind requireAuth + requireAdmin) ----

export const adminGetRewards = asyncHandler(async (_req, res) => {
  const [settings, categories] = await Promise.all([
    RewardSettings.getSettings(),
    Category.find({ store: { $eq: null } }).sort({ order: 1, name: 1 }).lean(),
  ])
  return sendSuccess(res, {
    settings: { rewardSystemEnabled: settings.rewardSystemEnabled },
    categories: categories.map((c) => ({
      _id: c._id,
      slug: c.slug,
      name: c.name,
      nameAr: c.nameAr,
      active: c.active,
      order: c.order,
      rewardEnabled: c.rewardEnabled,
      rewardNormalPercent: c.rewardNormalPercent,
      rewardSpecialPercent: c.rewardSpecialPercent,
    })),
  })
})

export const adminUpdateSettings = asyncHandler(async (req, res) => {
  const enabled = req.body?.rewardSystemEnabled
  if (typeof enabled !== 'boolean') {
    return sendError(res, 'rewardSystemEnabled must be a boolean', 400)
  }
  const settings = await RewardSettings.setEnabled(enabled)
  return sendSuccess(res, { settings: { rewardSystemEnabled: settings.rewardSystemEnabled } }, 'Reward settings updated')
})

export const adminUpdateCategoryReward = asyncHandler(async (req, res) => {
  const { rewardEnabled, rewardNormalPercent, rewardSpecialPercent } = req.body ?? {}
  const category = await Category.findById(req.params.id)
  if (!category) return sendError(res, 'Category not found', 404)
  if (category.store) {
    return sendError(res, 'Seller categories cannot become reward categories', 400)
  }

  if (rewardEnabled !== undefined && typeof rewardEnabled !== 'boolean') {
    return sendError(res, 'rewardEnabled must be a boolean', 400)
  }

  const normal = rewardNormalPercent !== undefined ? cleanPercent(rewardNormalPercent) : category.rewardNormalPercent
  const special = rewardSpecialPercent !== undefined ? cleanPercent(rewardSpecialPercent) : category.rewardSpecialPercent
  if ([normal, special].some((v) => v === null || v < 0 || v > 100)) {
    return sendError(res, 'Reward percentages must be numbers between 0 and 100', 400)
  }

  if (rewardEnabled !== undefined) category.rewardEnabled = Boolean(rewardEnabled)
  category.rewardNormalPercent = normal
  category.rewardSpecialPercent = special

  const saved = await category.save()
  return sendSuccess(
    res,
    {
      _id: saved._id,
      slug: saved.slug,
      name: saved.name,
      nameAr: saved.nameAr,
      active: saved.active,
      rewardEnabled: saved.rewardEnabled,
      rewardNormalPercent: saved.rewardNormalPercent,
      rewardSpecialPercent: saved.rewardSpecialPercent,
    },
    'Category reward updated'
  )
})