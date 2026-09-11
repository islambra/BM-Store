import '../config/bootstrap.js'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Post from '../models/Post.js'
import HeroBanner from '../models/HeroBanner.js'
import {
  translateMultipleTexts,
} from '../services/translationService.js'

const BATCH = 20
const stats = { products: { processed: 0, translated: 0, skipped: 0, failed: 0 }, categories: { processed: 0, translated: 0, skipped: 0, failed: 0 }, posts: { processed: 0, translated: 0, skipped: 0, failed: 0 }, banners: { processed: 0, translated: 0, skipped: 0, failed: 0 } }

const log = (kind, id, msg) => {
  console.log(`[${kind}] ${id} ${msg}`)
}

async function migrateProducts() {
  const needEnglish = Product.find({
    nameAr: { $exists: true, $nin: ['', null] },
    $or: [{ name: { $in: ['', null] } }, { name: { $exists: false } }],
  }).cursor()

  let batch = []
  for await (const doc of needEnglish) {
    batch.push(doc)
    if (batch.length >= BATCH) {
      await processProductBatch(batch)
      batch = []
    }
  }
  if (batch.length) await processProductBatch(batch)
}

async function processProductBatch(batch) {
  for (const doc of batch) {
    const nameAr = String(doc.nameAr ?? '').trim()
    if (!nameAr || (doc.name && String(doc.name).trim())) {
      stats.products.skipped += 1
      continue
    }
    stats.products.processed += 1
    const fields = { nameAr }
    if (doc.descriptionAr && !(doc.description && String(doc.description).trim())) {
      fields.descriptionAr = String(doc.descriptionAr).trim()
    }
    try {
      const translations = await translateMultipleTexts(Object.values(fields), 'en', 'ar')
      const keys = Object.keys(fields)
      keys.forEach((k, i) => {
        if (!translations[i]) return
        if (k === 'nameAr') doc.name = translations[i]
        if (k === 'descriptionAr') doc.description = translations[i]
      })
      await doc.save()
      stats.products.translated += 1
      log('Product', doc._id, 'translated')
    } catch (err) {
      stats.products.failed += 1
      log('Product', doc._id, `FAILED: ${err.message}`)
    }
  }
}

async function migrateCategories() {
  const docs = await Category.find({ nameAr: { $exists: true, $nin: ['', null] }, name: { $in: ['', null] } }).cursor()

  let batch = []
  for await (const doc of docs) {
    batch.push(doc)
    if (batch.length >= BATCH) {
      await processCategoryBatch(batch)
      batch = []
    }
  }
  if (batch.length) await processCategoryBatch(batch)
}

async function processCategoryBatch(batch) {
  for (const doc of batch) {
    const nameAr = String(doc.nameAr ?? '').trim()
    if (!nameAr || (doc.name && String(doc.name).trim())) {
      stats.categories.skipped += 1
      continue
    }
    stats.categories.processed += 1
    try {
      const [translated] = await translateMultipleTexts([nameAr], 'en', 'ar')
      if (translated) doc.name = translated
      await doc.save()
      stats.categories.translated += 1
      log('Category', doc._id, 'translated')
    } catch (err) {
      stats.categories.failed += 1
      log('Category', doc._id, `FAILED: ${err.message}`)
    }
  }
}

async function migratePosts() {
  const docs = await Post.find({ textAr: { $exists: true, $nin: ['', null] }, textEn: { $in: ['', null] } }).cursor()

  let batch = []
  for await (const doc of docs) {
    batch.push(doc)
    if (batch.length >= BATCH) {
      await processPostBatch(batch)
      batch = []
    }
  }
  if (batch.length) await processPostBatch(batch)
}

async function processPostBatch(batch) {
  for (const doc of batch) {
    const textAr = String(doc.textAr ?? '').trim()
    if (!textAr || (doc.textEn && String(doc.textEn).trim())) {
      stats.posts.skipped += 1
      continue
    }
    stats.posts.processed += 1
    try {
      const [translated] = await translateMultipleTexts([textAr], 'en', 'ar')
      if (translated) doc.textEn = translated
      await doc.save()
      stats.posts.translated += 1
      log('Post', doc._id, 'translated')
    } catch (err) {
      stats.posts.failed += 1
      log('Post', doc._id, `FAILED: ${err.message}`)
    }
  }
}

async function migrateBanners() {
  const docs = await HeroBanner.find({
    titleAr: { $exists: true, $nin: ['', null] },
    titleEn: { $in: ['', null] },
  }).cursor()

  let batch = []
  for await (const doc of docs) {
    batch.push(doc)
    if (batch.length >= BATCH) {
      await processBannerBatch(batch)
      batch = []
    }
  }
  if (batch.length) await processBannerBatch(batch)
}

async function processBannerBatch(batch) {
  for (const doc of batch) {
    const titleAr = String(doc.titleAr ?? '').trim()
    if (!titleAr || (doc.titleEn && String(doc.titleEn).trim())) {
      stats.banners.skipped += 1
      continue
    }
    stats.banners.processed += 1
    try {
      const fields = { titleAr }
      if (doc.badgeAr && !(doc.badgeEn && String(doc.badgeEn).trim())) fields.badgeAr = String(doc.badgeAr).trim()
      if (doc.subtitleAr && !(doc.subtitleEn && String(doc.subtitleEn).trim())) fields.subtitleAr = String(doc.subtitleAr).trim()
      if (doc.ctaAr && !(doc.ctaEn && String(doc.ctaEn).trim())) fields.ctaAr = String(doc.ctaAr).trim()
      const translations = await translateMultipleTexts(Object.values(fields), 'en', 'ar')
      const keys = Object.keys(fields)
      keys.forEach((k, i) => {
        if (!translations[i]) return
        if (k === 'titleAr') doc.titleEn = translations[i]
        if (k === 'badgeAr') doc.badgeEn = translations[i]
        if (k === 'subtitleAr') doc.subtitleEn = translations[i]
        if (k === 'ctaAr') doc.ctaEn = translations[i]
      })
      await doc.save()
      stats.banners.translated += 1
      log('HeroBanner', doc._id, 'translated')
    } catch (err) {
      stats.banners.failed += 1
      log('HeroBanner', doc._id, `FAILED: ${err.message}`)
    }
  }
}

async function main() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.startsWith('your_')) {
    console.error('MONGODB_URI is not configured. Copy server/.env.example to server/.env and set your connection string.')
    process.exit(1)
  }

  try {
    await connectDB(process.env.MONGODB_URI)
    console.log('MongoDB connected — starting translation migration...')

    await migrateProducts()
    await migrateCategories()
    await migratePosts()
    await migrateBanners()

    console.log('\n=== Translation migration complete ===')
    console.log('Products:  ', JSON.stringify(stats.products))
    console.log('Categories:', JSON.stringify(stats.categories))
    console.log('Posts:     ', JSON.stringify(stats.posts))
    console.log('Banners:   ', JSON.stringify(stats.banners))
  } catch (err) {
    console.error('[Migration failed]', err)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()