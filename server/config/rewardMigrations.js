import mongoose from 'mongoose'

export const REWARD_ORDER_NUMBER_INDEX = 'user_1_customerOrderNumber_1'

/**
 * Idempotent migration for the reward-per-order-number unique index.
 *
 * v1 used `{ user: 1, customerOrderNumber: 1 }` as a compound SPARSE unique
 * index. Since MongoDB treats a missing field as null in compound sparse
 * indexes, pending/cancelled/rejected orders (which now carry no number)
 * collided and made it impossible to create more than one such order per
 * customer.
 *
 * The replacement is a PARTIAL unique index matching only documents that
 * actually hold a numeric customerOrderNumber. It must be created outside the
 * mongoose schema so the legacy index (same default name) is dropped first —
 * otherwise `createIndex` fails with IndexOptionsConflict during autoIndex.
 *
 * Safe to run at every startup: dropping a nonexistent index is a no-op and
 * creating an already-identical index is idempotent.
 */
export async function runRewardOrderIndexMigration() {
  const orders = mongoose.connection.collection('orders')
  const existing = await orders.indexes()
  const legacy = existing.find((i) => i.name === REWARD_ORDER_NUMBER_INDEX && !i.partialFilterExpression)
  if (legacy) {
    await orders.dropIndex(REWARD_ORDER_NUMBER_INDEX)
  }
  await orders.createIndex(
    { user: 1, customerOrderNumber: 1 },
    { unique: true, partialFilterExpression: { customerOrderNumber: { $type: 'number' } } }
  )
}