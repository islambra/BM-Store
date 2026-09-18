import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, uniquePhone } from './helpers.mjs'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'

describe('public stores: BM Store is NOT a seller store', () => {
  before(connectTest)
  after(disconnectTest)

  it('enforces one store per seller via the unique seller index', async () => {
    const seller = await Seller.create({
      user: new mongoose.Types.ObjectId(),
      fullName: 'One Store Seller',
      email: `oss-${Date.now()}@test.dev`,
      phone: uniquePhone(),
    })
    const opts = { seller: seller._id, name: 'First Store', slug: `oss-first-${Date.now()}` }
    const first = await Store.create(opts)
    assert.ok(first._id)

    await assert.rejects(
      Store.create({ ...opts, slug: `oss-second-${Date.now()}` }),
      (err) => err?.code === 11000,
      'a second store for the same seller must be rejected by the unique index'
    )
    assert.equal(await Store.countDocuments({ seller: seller._id }), 1)
  })

  it('does not list the BM Store in the stores directory but still serves its catalog via /bm-store', async () => {
    const cat = `bmcat-${Date.now()}`
    const slugA = `bm-a-${Date.now()}`
    await Category.create({ slug: cat, name: 'BM Cats', nameAr: 'فئة', active: true, order: 1 })
    await Product.create([
      { slug: slugA, name: 'BM A', price: 250, category: cat, categoryName: 'BM Cats', isSpecialOffer: true, oldPrice: 300 },
      { slug: `bm-b-${Date.now()}`, name: 'BM B', price: 300, category: cat, categoryName: 'BM Cats' },
    ])

    const list = await request(app).get('/api/stores').query({ limit: 10 })
    assert.equal(list.status, 200)
    assert.ok(list.body.data.stores.length >= 0)
    assert.ok(!list.body.data.stores.some((s) => s.slug === 'bm-store'), 'the admin store must not appear among seller stores')

    const detail = await request(app).get('/api/stores/bm-store')
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.store.slug, 'bm-store')
    assert.ok(detail.body.data.allProducts.total >= 2)
    assert.ok(detail.body.data.newProducts.some((p) => p.slug === slugA), 'created product appears in the main catalog')
    assert.ok(detail.body.data.specialOffers.some((p) => p.slug === slugA), 'offer product appears in special offers')
    const catRow = detail.body.data.categories.find((c) => c.slug === cat)
    assert.ok(catRow, 'global category appears in the BM store categories')
    assert.ok(catRow.productCount >= 2)

    // search does not surface the BM Store either
    const search = await request(app).get('/api/stores').query({ q: 'bm', limit: 10 })
    assert.equal(search.status, 200)
    assert.ok(!search.body.data.stores.some((s) => s.slug === 'bm-store'))
  })

  it('returns an empty list (no $or error) when there are no stores', () => {
    return request(app)
      .get('/api/stores')
      .expect(200)
      .expect((res) => {
        assert.ok(Array.isArray(res.body.data.stores))
      })
  })
})

describe('seller subscription renewal', () => {
  before(connectTest)
  after(disconnectTest)

  async function adminAgent() {
    const { phone, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    return agent
  }

  it('adds the remaining unexpired days on top of the new plan period', async () => {
    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Renew Seller',
      email: `renew-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const sellerAgent = request.agent(app)
    const login = await sellerAgent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const seller = await Seller.findOne({ phone: number }).lean()
    const oldEnd = new Date(Date.now() + 10 * 86400000)
    const store = await Store.create({
      seller: seller._id,
      name: 'Renew Store',
      slug: `renew-store-${Date.now()}`,
      status: 'active',
      subscriptionPlan: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: oldEnd,
    })

    const submitted = await sellerAgent.post('/api/store/subscription/renew').send({
      subscriptionPlan: 'monthly',
      paymentProof: 'https://img/proof.jpg',
    })
    assert.equal(submitted.status, 201)
    const requestId = submitted.body.data.storeRequest._id

    const approved = await adminAgent().then((admin) => admin.post(`/api/admin/seller/store-requests/${requestId}/approve`))
    assert.equal(approved.status, 200)

    const updated = await Store.findById(store._id).lean()
    const newEnd = new Date(updated.subscriptionEndDate)
    const days = (newEnd - Date.now()) / 86400000
    assert.ok(days > 38 && days < 42, `expected ~40 days (10 carried over + 1 month), got ${days}`)
    assert.ok(newEnd > oldEnd, 'new end date must be later than the old end date')
  })
})

describe('seller store description (EN + AR)', () => {
  before(connectTest)
  after(disconnectTest)

  it('requires an Arabic description on the store request and keeps it on approval', async () => {
    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Desc Seller',
      email: `desc-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const missing = await agent.post('/api/seller/store-request').send({
      storeName: 'Desc Store',
      storeDescription: 'Fresh spices',
      slug: `desc-store-${Date.now()}`,
      subscriptionPlan: 'monthly',
      paymentProof: 'https://img/proof.jpg',
    })
    assert.equal(missing.status, 400, 'Arabic description must be required')

    const submitted = await agent.post('/api/seller/store-request').send({
      storeName: 'Desc Store',
      storeDescription: 'Fresh spices',
      storeDescriptionAr: 'توابل طازجة',
      slug: `desc-store-${Date.now()}`,
      subscriptionPlan: 'monthly',
      paymentProof: 'https://img/proof.jpg',
    })
    assert.equal(submitted.status, 201)
    assert.equal(submitted.body.data.storeRequest.storeDescriptionAr, 'توابل طازجة')

    const { phone: adminPhone, password: adminPassword } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone: adminPhone, password: adminPassword })

    const approved = await admin.post(`/api/admin/seller/store-requests/${submitted.body.data.storeRequest._id}/approve`)
    assert.equal(approved.status, 201)
    assert.equal(approved.body.data.store.description, 'Fresh spices')
    assert.equal(approved.body.data.store.descriptionAr, 'توابل طازجة')

    const patched = await agent.patch('/api/store').send({ descriptionAr: 'توابل معدلة' })
    assert.equal(patched.status, 200)
    assert.equal(patched.body.data.store.descriptionAr, 'توابل معدلة')
  })
})

describe('sellers may reuse BM Store category and product names', () => {
  before(connectTest)
  after(disconnectTest)

  it('creates a seller category and product that share the BM Store names', async () => {
    const stamp = Date.now()
    const sharedName = `Shared Name ${stamp}`
    const slugBase = sharedName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // BM Store (global) category + product already using the shared name/slug.
    await Category.create({ slug: slugBase, name: sharedName, nameAr: 'مشترك', active: true, order: 1 })
    const bmProduct = await Product.create({
      slug: slugBase,
      name: sharedName,
      price: 100,
      category: slugBase,
      categoryName: sharedName,
    })

    // Seller with an active store.
    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Same Name Seller',
      email: `samename-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const seller = await Seller.findOne({ phone: number }).lean()
    await Store.create({
      seller: seller._id,
      name: 'Same Name Store',
      slug: `same-name-store-${stamp}`,
      status: 'active',
      subscriptionPlan: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000),
    })

    const catRes = await agent.post('/api/store/categories').send({ name: sharedName, nameAr: 'مشترك' })
    assert.equal(catRes.status, 201, JSON.stringify(catRes.body))
    assert.equal(catRes.body.data.name, sharedName)
    assert.equal(catRes.body.data.slug, slugBase, 'seller category keeps the same slug as the BM Store category')

    const prodRes = await agent.post('/api/store/products').send({
      name: sharedName,
      nameAr: 'منتج مشترك',
      price: 150,
      category: catRes.body.data.slug,
    })
    assert.equal(prodRes.status, 201, JSON.stringify(prodRes.body))
    assert.equal(prodRes.body.data.name, sharedName)
    assert.equal(prodRes.body.data.ownerType, 'SELLER')
    assert.notEqual(prodRes.body.data.slug, bmProduct.slug, 'seller slug must not collide with the global product slug')
  })
})

describe('seller store category product counts', () => {
  before(connectTest)
  after(disconnectTest)

  it('returns real per-category counts on the public store page and in the seller dashboard', async () => {
    const stamp = Date.now()

    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Count Seller',
      email: `count-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const seller = await Seller.findOne({ phone: number }).lean()
    const store = await Store.create({
      seller: seller._id,
      name: 'Count Store',
      slug: `count-store-${stamp}`,
      status: 'active',
      subscriptionPlan: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000),
    })

    const catA = `count-a-${stamp}`
    const catB = `count-b-${stamp}`
    await Category.create([
      { store: store._id, slug: catA, name: 'Count A', nameAr: 'فئة أ', active: true, order: 1 },
      { store: store._id, slug: catB, name: 'Count B', nameAr: 'فئة ب', active: true, order: 2 },
    ])

    await Product.create([
      { store: store._id, ownerType: 'SELLER', slug: `count-p1-${stamp}`, name: 'P1', price: 100, category: catA, categoryName: 'Count A' },
      { store: store._id, ownerType: 'SELLER', slug: `count-p2-${stamp}`, name: 'P2', price: 200, category: catA, categoryName: 'Count A' },
      { store: store._id, ownerType: 'SELLER', slug: `count-p3-${stamp}`, name: 'P3', price: 300, category: catA, categoryName: 'Count A' },
      { store: store._id, ownerType: 'SELLER', slug: `count-p4-${stamp}`, name: 'P4', price: 400, category: catB, categoryName: 'Count B' },
      { store: store._id, ownerType: 'SELLER', slug: `count-p5-${stamp}`, name: 'P5', price: 500, category: catB, categoryName: 'Count B' },
    ])

    // Public store page: per-category productCount must be real numbers.
    const detail = await request(app).get(`/api/stores/${store.slug}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.store.productCount, 5)
    const bySlug = Object.fromEntries(detail.body.data.categories.map((c) => [c.slug, c]))
    assert.equal(bySlug[catA].productCount, 3, 'public store category A must show its real product count')
    assert.equal(bySlug[catB].productCount, 2, 'public store category B must show its real product count')

    // Seller dashboard: the same counts surface through /api/store/categories.
    const mine = await agent.get('/api/store/categories')
    assert.equal(mine.status, 200)
    const mineBySlug = Object.fromEntries(mine.body.data.categories.map((c) => [c.slug, c]))
    assert.equal(mineBySlug[catA].productCount, 3, 'dashboard category A must show its real product count')
    assert.equal(mineBySlug[catB].productCount, 2, 'dashboard category B must show its real product count')
  })
})
