import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import {
  connectTest,
  disconnectTest,
  createAdmin,
  createProduct,
  uniquePhone,
  clearCollection,
} from './helpers.mjs'
import { seedWilayas } from '../config/wilayas.js'

import mongoose from 'mongoose'
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'
import Product from '../models/Product.js'
import Wilaya from '../models/Wilaya.js'
import Order from '../models/Order.js'
import StoreDelivery from '../models/StoreDelivery.js'

// Identifies a wilaya by its administrative code ("01" ... "58") so tests read
// naturally and stay decoupled from the seed order.
async function wilayaCode(code) {
  const w = await Wilaya.findOne({ code }).lean()
  if (!w) throw new Error(`Wilaya ${code} not seeded`)
  return w
}

function uniqueSlug(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

let sellerCounter = 0
async function sellerAgent() {
  const number = uniquePhone()
  await request(app).post('/api/seller/register').send({
    fullName: 'Delivery Store Seller',
    email: `delivery-${sellerCounter++}-${number}@test.dev`,
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
    name: `Delivery Store ${sellerCounter}`,
    slug: uniqueSlug('delivery-store'),
    status: 'active',
    subscriptionPlan: 'monthly',
    subscriptionStartDate: new Date(),
    subscriptionEndDate: new Date(Date.now() + 30 * 86400000),
  })
  return { agent, seller, store }
}

async function adminAgent() {
  const { phone, password } = await createAdmin()
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone, password })
  return agent
}

async function customerAgent() {
  const number = uniquePhone()
  await request(app).post('/api/auth/register').send({
    name: 'Delivery Customer',
    phone: number,
    password: 'Secret@1234',
    confirmPassword: 'Secret@1234',
  })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
}

describe('seller delivery costs (per store)', () => {
  before(async () => {
    await connectTest()
    await seedWilayas()
  })
  after(disconnectTest)

  beforeEach(async () => {
    await clearCollection('seeded_sequences')
    const db = mongoose.connection.db
    await Promise.all([
      db.collection('storeDeliveries').deleteMany({}),
      db.collection('orders').deleteMany({}),
      db.collection('products').deleteMany({}),
      db.collection('stores').deleteMany({}),
      db.collection('sellers').deleteMany({}),
      db.collection('wilayas').deleteMany({}),
    ])
    await seedWilayas()
  })

  it('requires a seller session to manage delivery costs', async () => {
    const anon = await request(app).get('/api/store/delivery')
    assert.equal(anon.status, 401)
    const anonPatch = await request(app).patch('/api/store/delivery/01').send({ deliveryPrice: 400 })
    assert.equal(anonPatch.status, 401)

    const customer = await customerAgent()
    const denied = await customer.get('/api/store/delivery')
    assert.equal(denied.status, 403)
  })

  it('lists every wilaya at the store default price initially', async () => {
    const { agent } = await sellerAgent()
    const res = await agent.get('/api/store/delivery')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.data.defaultPrice, 350)
    assert.equal(res.body.data.wilayas.length, 58)
    for (const w of res.body.data.wilayas) {
      assert.equal(w.deliveryPrice, 350)
    }
  })

  it('saves the store default and applies it to unconfigured wilayas', async () => {
    const { agent } = await sellerAgent()
    const updated = await agent.patch('/api/store/delivery').send({ deliveryPrice: 500 })
    assert.equal(updated.status, 200, JSON.stringify(updated.body))
    assert.equal(updated.body.data.defaultPrice, 500)

    const res = await agent.get('/api/store/delivery')
    assert.equal(res.body.data.wilayas.length, 58)
    for (const w of res.body.data.wilayas) {
      assert.equal(w.deliveryPrice, 500)
    }
  })

  it('overrides a single wilaya and lets it be changed again', async () => {
    const { agent } = await sellerAgent()
    await agent.patch('/api/store/delivery').send({ deliveryPrice: 600 })

    const set = await agent.patch('/api/store/delivery/01').send({ deliveryPrice: 900 })
    assert.equal(set.status, 200, JSON.stringify(set.body))
    assert.equal(set.body.data.code, '01')

    const res = await agent.get('/api/store/delivery')
    const byCode = Object.fromEntries(res.body.data.wilayas.map((w) => [w.code, w]))
    assert.equal(byCode['01'].deliveryPrice, 900, 'configured wilaya uses its override')
    assert.equal(byCode['02'].deliveryPrice, 600, 'unconfigured wilaya falls back to the store default')

    const second = await agent.patch('/api/store/delivery/01').send({ deliveryPrice: 700 })
    assert.equal(second.status, 200)
    const after = await agent.get('/api/store/delivery')
    assert.equal(
      Object.fromEntries(after.body.data.wilayas.map((w) => [w.code, w]))['01'].deliveryPrice,
      700,
    )
  })

  it('keeps each seller store isolated: another store keeps its own default', async () => {
    const a = await sellerAgent()
    const b = await sellerAgent()
    await a.agent.patch('/api/store/delivery/01').send({ deliveryPrice: 900 })

    const resA = await a.agent.get('/api/store/delivery')
    assert.equal(
      Object.fromEntries(resA.body.data.wilayas.map((w) => [w.code, w]))['01'].deliveryPrice,
      900,
    )

    const resB = await b.agent.get('/api/store/delivery')
    const byCodeB = Object.fromEntries(resB.body.data.wilayas.map((w) => [w.code, w]))
    assert.equal(byCodeB['01'].deliveryPrice, 350, 'seller B is not affected by seller A changes')
  })

  it('rejects negative/NaN prices and unknown codes, and keeps changes detached from the global list', async () => {
    const { agent } = await sellerAgent()

    const negative = await agent.patch('/api/store/delivery/01').send({ deliveryPrice: -5 })
    assert.equal(negative.status, 400)
    const nan = await agent.patch('/api/store/delivery').send({ deliveryPrice: 'abc' })
    assert.equal(nan.status, 400)
    const missing = await agent.patch('/api/store/delivery').send({})
    assert.equal(missing.status, 400)

    const unknown = await agent.patch('/api/store/delivery/ZZ').send({ deliveryPrice: 100 })
    assert.equal(unknown.status, 404)

    // The seller's overrides never surface on the public global list.
    await agent.patch('/api/store/delivery/01').send({ deliveryPrice: 900 })
    const publicList = await request(app).get('/api/wilayas')
    const adrar = publicList.body.data.find((w) => w.code === '01')
    assert.equal(adrar.deliveryPrice, 350, 'global BM Store price stays untouched')
  })

  it('prices a seller-store order with the seller delivery costs at creation and on edit', async () => {
    const { agent: seller, store } = await sellerAgent()
    await seller.patch('/api/store/delivery/01').send({ deliveryPrice: 1200 })

    const product = await Product.create({
      name: 'Delivery Product',
      slug: uniqueSlug('delivery-product'),
      price: 800,
      category: 'spices',
      categoryName: 'Spices',
      store: store._id,
      ownerType: 'SELLER',
    })

    const customer = await customerAgent()
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: {
        fullName: 'Buyer One',
        phone: '+213 555 77 77 77',
        wilayaId: (await wilayaCode('01'))._id,
        commune: 'Adrar Centre',
        address: 'Rue 1',
      },
    })
    assert.equal(created.status, 201, JSON.stringify(created.body))
    assert.equal(created.body.data.order.delivery, 1200)
    assert.equal(created.body.data.order.subtotal, 800)
    assert.equal(created.body.data.order.total, 800 + 1200)

    // Editing the wilaya re-resolves against the seller's costs.
    const edited = await customer.patch(`/api/orders/${created.body.data.order._id}`).send({
      customer: { wilayaId: (await wilayaCode('16'))._id },
    })
    assert.equal(edited.status, 200, JSON.stringify(edited.body))
    assert.equal(edited.body.data.order.delivery, 350, 'wilaya 16 falls back to the store default')
  })

  it('keeps BM Store and global orders on the platform price while seller orders use their own', async () => {
    const { agent: seller, store } = await sellerAgent()
    await seller.patch('/api/store/delivery/01').send({ deliveryPrice: 1400 })

    const bmProduct = await createProduct({ name: 'BM Delivery Product', price: 300 })
    const sellerProduct = await Product.create({
      name: 'Another Delivery Product',
      slug: uniqueSlug('another-delivery-product'),
      price: 300,
      category: 'spices',
      categoryName: 'Spices',
      store: store._id,
      ownerType: 'SELLER',
    })

    const wilayaPk = await wilayaCode('01')
    const customer = await customerAgent()

    const bmOrder = await customer.post('/api/orders').send({
      items: [{ productId: bmProduct._id, qty: 1 }],
      customer: {
        fullName: 'BM Buyer',
        phone: '+213 555 88 88 88',
        wilayaId: wilayaPk._id,
        commune: 'Adrar Centre',
        address: 'Rue 2',
      },
    })
    assert.equal(bmOrder.status, 201, JSON.stringify(bmOrder.body))
    assert.equal(bmOrder.body.data.order.delivery, 350, 'BM Store uses the global price')

    const sellerOrder = await customer.post('/api/orders').send({
      items: [{ productId: sellerProduct._id, qty: 1 }],
      customer: {
        fullName: 'Store Buyer',
        phone: '+213 555 99 99 99',
        wilayaId: wilayaPk._id,
        commune: 'Adrar Centre',
        address: 'Rue 2',
      },
    })
    assert.equal(sellerOrder.status, 201, JSON.stringify(sellerOrder.body))
    assert.equal(sellerOrder.body.data.order.delivery, 1400, 'seller store uses the seller price')
  })

  it('lets the admin change the global price without touching the seller overrides', async () => {
    const { agent: seller } = await sellerAgent()
    await seller.patch('/api/store/delivery/01').send({ deliveryPrice: 1100 })

    const admin = await adminAgent()
    const adminSet = await admin.patch('/api/admin/wilayas/01').send({ deliveryPrice: 900 })
    assert.equal(adminSet.status, 200, JSON.stringify(adminSet.body))

    const res = await seller.get('/api/store/delivery')
    assert.equal(
      Object.fromEntries(res.body.data.wilayas.map((w) => [w.code, w]))['01'].deliveryPrice,
      1100,
      'the seller override still wins for that store',
    )

    const publicList = await request(app).get('/api/wilayas')
    assert.equal(publicList.body.data.find((w) => w.code === '01').deliveryPrice, 900)
  })

  it('falls back through default → store default → platform default for careful edge cases', async () => {
    const { agent: seller, store } = await sellerAgent()
    await seller.patch('/api/store/delivery').send({ deliveryPrice: 600 })

    // A seller-store order with an UNKNOWN wilaya code keeps the store default.
    const sellerProduct = await Product.create({
      name: 'Fallback Product',
      slug: uniqueSlug('fallback-product'),
      price: 600,
      category: 'spices',
      categoryName: 'Spices',
      store: store._id,
      ownerType: 'SELLER',
    })
    const customer = await customerAgent()
    const legacy = await customer.post('/api/orders').send({
      items: [{ productId: sellerProduct._id, qty: 1 }],
      customer: {
        fullName: 'Legacy Buyer',
        phone: '+213 555 00 00 01',
        wilaya: 'ZZ',
        wilayaName: 'Unknown',
        commune: 'Centre',
        address: 'Rue 3',
      },
    })
    assert.equal(legacy.status, 201, JSON.stringify(legacy.body))
    assert.equal(legacy.body.data.order.delivery, 600, 'unknown-code seller order uses the store default')
  })
})
