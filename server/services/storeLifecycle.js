import Store from '../models/Store.js'

// Days a seller has to renew after their subscription ends before the store
// is automatically removed from the platform. The store and its data are
// soft-deleted (kept in the DB) so a late renewal can restore everything.
export const GRACE_DAYS = 5

// Mark stores whose subscription has lapsed as 'expired'.
export async function markExpiredStores() {
  const now = new Date()
  const res = await Store.updateMany(
    {
      status: 'active',
      subscriptionEndDate: { $exists: true, $ne: null, $lte: now },
    },
    { $set: { status: 'expired' } }
  )
  return res.modifiedCount || 0
}

// Soft-delete stores that have been expired for more than GRACE_DAYS without
// payment: hide them everywhere. The data stays intact so an approved renewal
// restores the store with all its old details.
export async function purgeDeletedStores() {
  const threshold = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  const candidates = await Store.find({
    status: 'expired',
    subscriptionEndDate: { $exists: true, $ne: null, $lte: threshold },
  })
    .select('_id')
    .lean()

  if (candidates.length === 0) return 0

  const storeIds = candidates.map((s) => s._id)
  await Store.updateMany({ _id: { $in: storeIds } }, { $set: { status: 'deleted' } })
  return storeIds.length
}

export async function runStoreLifecycle() {
  const expired = await markExpiredStores()
  const purged = await purgeDeletedStores()
  if (expired > 0 || purged > 0) {
    console.log(`[Store lifecycle] expired=${expired} deleted=${purged}`)
  }
}