import Order from '../models/Order.js'
import Category from '../models/Category.js'
import RewardSettings from '../models/RewardSettings.js'

/**
 * BM Store reward discount system (single source of truth, server-side only).
 *
 * Rewards belong to BM Store orders and BM Store categories only (Category
 * documents with NO `store`). Seller products/orders never participate and
 * seller categories can never be configured as reward categories.
 *
 * Purchase cycle per customer, driven by their personal reward order number:
 *   - orders 1-9   -> normal percentage of every rewarded category
 *   - order 10     -> special percentage of every rewarded category
 *   - orders 11-19 -> normal again
 *   - order 20     -> special again
 *   - and so on (every 10th).
 *
 * The number is assigned ONLY when an order is confirmed, which is exactly
 * what makes the purchase count increase only on confirmed orders: pending,
 * cancelled and rejected orders never consume a number.
 */

/** Milestone marker: every 10th order (10, 20, 30, ...). */
export function isMilestoneOrder(customerOrderNumber) {
  const n = Number(customerOrderNumber)
  return Number.isInteger(n) && n > 0 && n % 10 === 0
}

/**
 * Legacy flat percents kept for orders already holding a reward number from
 * before the per-category system shipped (5% normal / 7% every 10th). New
 * orders only get per-category percentages at confirmation via
 * applyRewardToItems.
 */
export function getLegacyDiscountPercent(customerOrderNumber) {
  return isMilestoneOrder(customerOrderNumber) ? 7 : 5
}

/** Integer DZD discount amount for a line/subtotal + percent. */
export function calcDiscountAmount(value, discountPercent) {
  const v = Math.max(0, Math.round(Number(value) || 0))
  const p = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  return Math.round((v * p) / 100)
}

/**
 * Allocates the customer's next personal reward order number.
 *
 * Rule: next = (highest number ever assigned to this user) + 1. Numbers are
 * assigned only at confirmation, so the count of allocated numbers equals the
 * count of confirmed BM orders — rejected/cancelled/pending orders never
 * increment it. Historical orders never change.
 *
 * Unique { user, customerOrderNumber } index protects concurrent confirms;
 * callers must tolerate duplicate-key errors and retry with the next number.
 */
export async function allocateCustomerOrderNumber(userId) {
  const maxDoc = await Order.findOne({ user: userId, customerOrderNumber: { $ne: null } })
    .sort({ customerOrderNumber: -1 })
    .select('customerOrderNumber')
    .lean()
  if (maxDoc && Number.isInteger(maxDoc.customerOrderNumber)) {
    return maxDoc.customerOrderNumber + 1
  }
  return 1
}

/** Peek at the next number (no allocation, display estimates only). */
export async function peekNextCustomerOrderNumber(userId) {
  const next = await allocateCustomerOrderNumber(userId)
  return { nextCustomerOrderNumber: next }
}

/**
 * Computes per-category reward discounts for a BM order's items at confirm
 * time. Mutates the order items' snapshot fields in place. Percentage comes
 * from the category config for the customer's order number (normal vs every
 * 10th special). When the system is disabled, a category is inactive/not
 * enabled, or a category has no config, its lines simply get 0%.
 *
 * Returns the order-level aggregate: total discountAmount and a blended
 * percent (display-only) = discountAmount / discounted subtotal.
 */
export async function applyRewardToItems(items, customerOrderNumber) {
  const settings = await RewardSettings.getSettings()

  if (!settings.rewardSystemEnabled) {
    let discountAmount = 0
    for (const item of items) {
      item.discountPercent = 0
      item.discountAmount = 0
      item.isRewardMilestone = false
    }
    return { discountAmount, blendedPercent: 0, isMilestone: false }
  }

  const slugs = [...new Set(items.map((i) => i.category).filter(Boolean))]
  const configs = slugs.length
    ? await Category.find({ slug: { $in: slugs }, active: true, rewardEnabled: true }).lean()
    : []
  const configBySlug = new Map(configs.filter((c) => !c.store).map((c) => [c.slug, c]))

  const milestone = isMilestoneOrder(customerOrderNumber)
  let discountAmount = 0
  let weightedBase = 0

  for (const item of items) {
    const cfg = configBySlug.get(item.category)
    const percent = cfg ? (milestone ? cfg.rewardSpecialPercent : cfg.rewardNormalPercent) : 0
    const amount = calcDiscountAmount(item.price * item.qty, percent)
    item.discountPercent = percent
    item.discountAmount = amount
    item.isRewardMilestone = milestone
    discountAmount += amount
    weightedBase += item.price * item.qty
  }

  const blendedPercent =
    discountAmount > 0 && weightedBase > 0 ? Math.round((discountAmount * 100 * 10) / weightedBase) / 10 : 0

  return { discountAmount, blendedPercent, isMilestone: milestone }
}