import 'dotenv/config'

// Keep tests deterministic: never hit the free translation fallback over the
// network. Google Cloud credentials are also absent in the test environment,
// so Arabic content is stored as-is (existing behaviour covered by tests).
process.env.TRANSLATION_FALLBACK = 'off'

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Category from '../models/Category.js'
import HeroBanner from '../models/HeroBanner.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Product from '../models/Product.js'
import { runRewardOrderIndexMigration } from '../config/rewardMigrations.js'
import { runCategoryIndexMigration } from '../config/categoryMigrations.js'
import { seedWilayas } from '../config/wilayas.js'

function testUri() {
  const raw = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmstore'
  const withoutQuery = raw.split('?')[0]
  return withoutQuery.replace(/\/[^/]+$/, '/bmstore_test')
}

export const TEST_URI = testUri()

export async function connectTest() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 120000,
    })
  }
  await runRewardOrderIndexMigration()
  await runCategoryIndexMigration()
  await seedWilayas()
}

export async function disconnectTest() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

export async function clearCollection(name) {
  await mongoose.connection.db.collection(name).deleteMany({})
}

let phoneCounter = 0
export const uniquePhone = () => {
  phoneCounter += 1
  const base = String(Date.now()).slice(-8)
  const seq = String(phoneCounter).padStart(4, '0')
  return `07${base}${seq}`.slice(0, 13)
}

export async function createUser({ name = 'Test User', role = 'USER', password = 'Secret@1234' } = {}) {
  const phone = uniquePhone()
  const user = await User.create({
    name,
    phone,
    role,
    passwordHash: await bcrypt.hash(password, 10),
  })
  return { user, phone, password }
}

export async function createAdmin() {
  return createUser({ name: 'Test Admin', role: 'ADMIN' })
}

export async function createMarketer({ name = 'Test Marketer' } = {}) {
  const { user, phone, password } = await createUser({ name, role: 'MARKETER' })
  let code = `MKT${Date.now().toString(36).toUpperCase()}`
  while (await MarketerProfile.exists({ referralCode: code })) {
    code = `MKT${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }
  const profile = await MarketerProfile.create({ user: user._id, referralCode: code, publicName: name })
  return { user, phone, password, profile }
}

export async function createCategory({ slug, name, active = true, order = 0, icon = 'spices' }) {
  return Category.create({
    slug,
    name: name ?? slug,
    nameAr: name ?? slug,
    nameFr: name ?? slug,
    order,
    active,
    image: '',
    icon,
  })
}

export async function createBanner({ titleEn = 'Banner', active = true, order = 0, image = '/img.jpg' }) {
  return HeroBanner.create({
    image,
    titleEn,
    active,
    order,
    badgeEn: '',
    subtitleEn: '',
    ctaEn: '',
  })
}

export async function createProduct({ name = 'Test Product', price = 1000, slug, category = 'spices' } = {}) {
  const uniqueSlug = slug ?? `test-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  return Product.create({
    name,
    nameAr: name,
    nameFr: name,
    slug: uniqueSlug,
    price,
    image: 'https://img/test.jpg',
    category,
    categoryName: category,
  })
}
