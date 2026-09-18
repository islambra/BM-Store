import mongoose from 'mongoose'

// Legacy indexes left on `categories` by an earlier schema where `slug` was
// globally unique and categories carried an `ownerType`.
//
// The current schema scopes slug uniqueness per store via the compound
// `{ store: 1, slug: 1 }` index, so a leftover global `slug_1` unique index
// makes two stores (the BM Store and a seller store) unable to reuse the same
// category slug: creating a same-named seller category fails on `slug_1` and
// silently falls back to a mangled `...-1` slug.
//
// `autoIndex` only creates missing indexes, it never drops obsolete ones, so
// this must be cleaned up explicitly. Safe to run on every startup: dropping a
// nonexistent index is a no-op.
export const LEGACY_CATEGORY_INDEXES = [
  'slug_1',
  'ownerType_1',
  'ownerType_1_store_1',
  'ownerType_1_store_1_slug_1',
]

export async function runCategoryIndexMigration() {
  const categories = mongoose.connection.collection('categories')
  let existing
  try {
    existing = await categories.indexes()
  } catch (err) {
    // NamespaceNotFound — nothing to migrate yet.
    if (err?.code === 26) return
    throw err
  }
  const names = new Set(existing.map((i) => i.name))
  for (const name of LEGACY_CATEGORY_INDEXES) {
    if (names.has(name)) await categories.dropIndex(name)
  }
}
