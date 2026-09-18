import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import app from '../app.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import Store from '../models/Store.js'
import Seller from '../models/Seller.js'
import { connectTest, disconnectTest, clearCollection, createAdmin, createCategory, createProduct, uniquePhone } from './helpers.mjs'

// Required 8 data-driven categories with these server slugs.
const REQUIRED = [
  'spices', 'cosmetics', 'baking', 'nuts',
  'legumes', 'natural-mixes', 'dried-fruits', 'oils-honey',
]

describe('categories', () => {
  before(connectTest)
  beforeEach(async () => {
    await clearCollection('categories')
    await clearCollection('products')
  })
  after(disconnectTest)

  async function adminHeaders() {
    const { phone, password } = await createAdmin()
    const login = await request(app).post('/api/auth/login').send({ phone, password })
    return { Authorization: `Bearer ${login.headers['set-cookie'][0].split(';')[0].split('=')[1]}` }
  }

  it('public list exposes only active categories in order', async () => {
    await createCategory({ slug: 'spices', name: 'Spices', order: 2 })
    await createCategory({ slug: 'nuts', name: 'Nuts', order: 1 })
    await createCategory({ slug: 'hidden', name: 'Hidden', active: false, order: 3 })

    const res = await request(app).get('/api/categories')
    assert.equal(res.status, 200)
    const slugs = res.body.data.map((c) => c.slug)
    assert.deepEqual(slugs, ['nuts', 'spices'])
  })

  it('admin creates a category; duplicate slug is rejected', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ slug: 'spices', name: 'Spices' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'spices')

    const dup = await request(app).post('/api/admin/categories').set(h).send({ slug: 'Spices', name: 'Duplicate' })
    assert.equal(dup.status, 409)
  })

  it('auto-generates a slug when omitted', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ name: 'Fresh Honey' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'fresh-honey')
  })

  it('USER cannot create categories', async () => {
    const res = await request(app).post('/api/admin/categories').send({ slug: 'spices', name: 'Spices' })
    assert.equal(res.status, 401)
  })

  it('keeps seller categories out of the public list and lets the admin reuse their slug', async () => {
    const h = await adminHeaders()
    await Category.create({
      slug: 'spices',
      name: 'Seller Spices',
      nameAr: 'توابل',
      store: new mongoose.Types.ObjectId(),
      active: true,
    })

    const publicList = await request(app).get('/api/categories')
    assert.equal(publicList.status, 200)
    assert.ok(
      !publicList.body.data.some((c) => c.slug === 'spices'),
      'seller categories must not leak into the global storefront list'
    )

    const created = await request(app).post('/api/admin/categories').set(h).send({ slug: 'spices', name: 'Spices' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'spices')
  })

  it('admin updates and deletes categories', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ slug: 'nuts', name: 'Nuts' })
    const id = created.body.data._id

    const updated = await request(app).patch(`/api/admin/categories/${id}`).set(h).send({ name: 'Nuts & Seeds' })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.name, 'Nuts & Seeds')

    const deleted = await request(app).delete(`/api/admin/categories/${id}`).set(h)
    assert.equal(deleted.status, 200)
  })

  it('required category slugs are present in the storefront', async () => {
    for (const slug of REQUIRED) await createCategory({ slug })
    const res = await request(app).get('/api/categories')
    const slugs = res.body.data.map((c) => c.slug).sort()
    assert.deepEqual(slugs, [...REQUIRED].sort())
  })

  it('category product counts exclude seller-store products', async () => {
    const slug = `count-cat-${Date.now()}`
    await createCategory({ slug, name: 'Count Cat', order: 1 })

    await Product.create([
      { slug: `cc-a-${Date.now()}`, name: 'CC A', price: 100, category: slug, categoryName: 'Count Cat', ownerType: 'BM_STORE' },
      { slug: `cc-b-${Date.now()}`, name: 'CC B', price: 100, category: slug, categoryName: 'Count Cat', ownerType: 'BM_STORE' },
    ])

    const seller = await Seller.create({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Count Seller',
      email: `cnt-${Date.now()}@test.dev`,
      phone: uniquePhone(),
    })
    const store = await Store.create({
      seller: seller._id,
      name: 'Count Store',
      slug: `count-store-${Date.now()}`,
      status: 'active',
      subscriptionEndDate: new Date(Date.now() + 86400000 * 30),
    })
    await Product.create({
      slug: `cc-s-${Date.now()}`,
      name: 'CC Seller',
      price: 100,
      category: slug,
      categoryName: 'Count Cat',
      ownerType: 'SELLER',
      store: store._id,
      seller: seller._id,
    })

    const res = await request(app).get('/api/categories')
    const row = res.body.data.find((c) => c.slug === slug)
    assert.ok(row, 'category must be listed')
    assert.equal(row.productCount, 2)
  })
})