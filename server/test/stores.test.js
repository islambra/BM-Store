import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, uniquePhone } from './helpers.mjs'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'

describe('public stores: BM Store is NOT a seller store', () => {
  before(connectTest)
  after(disconnectTest)

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

    const approved = await adminAgent().then((admin) => admin.post(`/api/admin/store-requests/${requestId}/approve`))
    assert.equal(approved.status, 200)

    const updated = await Store.findById(store._id).lean()
    const newEnd = new Date(updated.subscriptionEndDate)
    const days = (newEnd - Date.now()) / 86400000
    assert.ok(days > 38 && days < 42, `expected ~40 days (10 carried over + 1 month), got ${days}`)
    assert.ok(newEnd > oldEnd, 'new end date must be later than the old end date')
  })
})
