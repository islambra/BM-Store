import Order from '../models/Order.js'

export const NORMAL_DISCOUNT_PERCENT = 5
export const MILESTONE_DISCOUNT_PERCENT = 7

/**
 * Single source of truth for the customer order discount.
 *
 * Every authenticated customer gets a discount on every order, based on their
 * PERSONAL order number (per-customer sequence, not the global store number):
 *   - normal orders            -> 5%
 *   - every 10th order (10, 20, 30, ...) -> 7%
 */
export function getCustomerDiscountPercent(customerOrderNumber) {
  const n = Number(customerOrderNumber)
  if (!Number.isInteger(n) || n < 1) return NORMAL_DISCOUNT_PERCENT
  return n % 10 === 0 ? MILESTONE_DISCOUNT_PERCENT : NORMAL_DISCOUNT_PERCENT
}

/** Integer DZD discount amount for a subtotal + percent. */
export function calcCustomerDiscountAmount(subtotal, discountPercent) {
  const s = Math.max(0, Math.round(Number(subtotal) || 0))
  const p = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  return Math.round((s * p) / 100)
}

/**
 * Allocates the customer's next personal order number.
 *
 * Rule: next = (highest customerOrderNumber ever allocated to this user) + 1.
 * Using the max (instead of a live count) keeps numbering understandable when
 * old orders are cancelled/rejected/deleted: numbers are never reused and
 * historical orders never change. Every created order — including ones later
 * cancelled or rejected — permanently consumes its number. Deleted
 * pending-review orders leave a gap rather than a duplicate.
 *
 * Legacy orders created before this system have no customerOrderNumber; for a
 * user with only legacy orders the next number falls back to
 * (legacy count + 1) so the sequence continues instead of restarting at 1.
 *
 * Callers must tolerate rare concurrent allocations: pair this with the
 * unique { user, customerOrderNumber } index and retry on duplicate-key.
 */
export async function allocateCustomerOrderNumber(userId) {
  const [maxDoc, legacyCount] = await Promise.all([
    Order.findOne({ user: userId, customerOrderNumber: { $ne: null } })
      .sort({ customerOrderNumber: -1 })
      .select('customerOrderNumber')
      .lean(),
    Order.countDocuments({ user: userId }),
  ])
  if (maxDoc && Number.isInteger(maxDoc.customerOrderNumber)) {
    return maxDoc.customerOrderNumber + 1
  }
  return legacyCount + 1
}

/** Peek at the next number/percent without allocating (display estimates only). */
export async function peekNextCustomerDiscount(userId) {
  const next = await allocateCustomerOrderNumber(userId)
  return { nextCustomerOrderNumber: next, nextDiscountPercent: getCustomerDiscountPercent(next) }
}
