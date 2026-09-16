import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../app.js'
import {
  connectTest,
  disconnectTest,
  createAdmin,
  createMarketer,
  createCategory,
  createProduct,
  uniquePhone,
} from './helpers.mjs'
import Commission from '../models/Commission.js'
import Order from '../models/Order.js'
import Referral from '../models/Referral.js'
import RewardSettings from '../models/RewardSettings.js'
import Store from '../models/Store.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'

const CUSTOMER = { fullName: 'Ahmed Benali', phone: '+213 555 12 34 56', wilaya: '16', commune: 'X', address: 'Y' }

async function createCustomerAgent(name = 'Reward Customer') {
  const number = uniquePhone()
  await request(app).post('/api/auth/register').send({ name, phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
}

async function createAdminAgent() {
  const { phone, password } = await createAdmin()
  const admin = request.agent(app)
  await admin.post('/api/auth/login').send({ phone, password })
  return admin
}

async function placeOrder(agent, product, qty = 1, extra = {}) {
  const res = await agent.post('/api/orders').send({
    items: [{ productId: product._id, qty }],
    customer: CUSTOMER,
    ...extra,
  })
  assert.equal(res.status, 201)
  return res.body.data.order
}

async function confirmOrder(admin, orderId) {
  const res = await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' })
  assert.equal(res.status, 200)
  return res.body.data.order
}

async function makeRewardCategory(opts = {}) {
  const slug = `rw-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const cat = await createCategory({
    slug,
    name: opts.name ?? slug,
    active: opts.active ?? true,
  })
  cat.rewardEnabled = opts.enabled ?? true
  cat.rewardNormalPercent = opts.normal ?? 0
  cat.rewardSpecialPercent = opts.special ?? 0
  await cat.save()
  return cat
}

async function makeSellerRewardCategory() {
  const sellerCat = await createCategory({
    slug: `sw-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name: `srw-${Date.now()}`,
  })
  const store = await Store.create({
    seller: new mongoose.Types.ObjectId(),
    name: `Seller ${Date.now()}`,
    slug: `seller-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    status: 'active',
    subscriptionEndDate: new Date(Date.now() + 86400000 * 30),
  })
  sellerCat.store = store._id
  sellerCat.rewardEnabled = true
  sellerCat.rewardNormalPercent = 5
  sellerCat.rewardSpecialPercent = 10
  await sellerCat.save()

  const product = await createProduct({
    name: 'Seller Product',
    price: 900,
    category: sellerCat.slug,
    stock: 20,
  })
  await Product.updateOne({ _id: product._id }, { $set: { ownerType: 'SELLER', store: store._id, seller: store.seller } })
  const fresh = await Product.findById(product._id).lean()
  return { sellerCat, store, product: fresh }
}

describe('reward discount — purchase cycle (1-9 normal, 10 special, 11-19 normal, 20 special, 21 normal)', () => {
  before(connectTest)
  after(disconnectTest)

  it('covers orders 1, 2, 9, 10, 11, 19, 20, 21 with per-category percentages', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 12 })
    const product = await createProduct({ name: 'Reward Ladder', price: 1000, category: category.slug, stock: 100 })
    const customer = await createCustomerAgent()

    const expected = (n) => ({ percent: n % 10 === 0 ? 12 : 5, amount: n % 10 === 0 ? 120 : 50 })

    for (let i = 1; i <= 21; i += 1) {
      const pending = await placeOrder(customer, product)
      assert.equal(pending.customerOrderNumber, undefined)
      assert.equal(pending.discountPercent, 0)
      assert.equal(pending.discountAmount, 0)
      assert.equal(pending.total, 1350)

      const confirmed = await confirmOrder(admin, pending._id)
      const exp = expected(i)
      assert.equal(confirmed.customerOrderNumber, i)
      assert.equal(confirmed.discountPercent, exp.percent)
      assert.equal(confirmed.discountAmount, exp.amount)
      assert.equal(confirmed.items[0].discountPercent, exp.percent)
      assert.equal(confirmed.items[0].discountAmount, exp.amount)
      assert.equal(confirmed.items[0].isRewardMilestone, i % 10 === 0)
      assert.equal(confirmed.total, 1000 + 350 - exp.amount)
    }

    const peek = await customer.get('/api/orders/me')
    assert.equal(peek.body.data.nextCustomerOrderNumber, 22)
  })

  it('applies each category its own normal and special percentage on multi-category orders', async () => {
    const admin = await createAdminAgent()
    const catA = await makeRewardCategory({ normal: 5, special: 10 })
    const catB = await makeRewardCategory({ normal: 8, special: 15 })
    const productA = await createProduct({ name: 'Cat A', price: 1000, category: catA.slug, stock: 50 })
    const productB = await createProduct({ name: 'Cat B', price: 2000, category: catB.slug, stock: 50 })
    const customer = await createCustomerAgent()

    // orders 1-9: single product, normal percentage on cat A
    for (let i = 1; i <= 9; i += 1) {
      const pending = await placeOrder(customer, productA)
      const confirmed = await confirmOrder(admin, pending._id)
      assert.equal(confirmed.customerOrderNumber, i)
      assert.equal(confirmed.discountAmount, 50)
      assert.equal(confirmed.items[0].discountPercent, 5)
    }

    // order #10: multi-category, both at their special percentages
    const multi = await customer.post('/api/orders').send({
      items: [
        { productId: productA._id, qty: 1 },
        { productId: productB._id, qty: 1 },
      ],
      customer: CUSTOMER,
    })
    assert.equal(multi.status, 201)
    const confirmed = await confirmOrder(admin, multi.body.data.order._id)
    assert.equal(confirmed.customerOrderNumber, 10)
    assert.equal(confirmed.items[0].discountPercent, 10)
    assert.equal(confirmed.items[0].discountAmount, 100)
    assert.equal(confirmed.items[1].discountPercent, 15)
    assert.equal(confirmed.items[1].discountAmount, 300)
    assert.equal(confirmed.discountAmount, 400)
    assert.equal(confirmed.discountPercent, 13.3) // blended display figure
    assert.equal(confirmed.subtotal, 3000)
    assert.equal(confirmed.total, 3000 + 350 - 400)
  })

  it('keeps independent reward sequences per customer', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Indep', price: 500, category: category.slug, stock: 100 })
    const adam = await createCustomerAgent('Adam')
    const bella = await createCustomerAgent('Bella')

    const a1 = await confirmOrder(admin, (await placeOrder(adam, product))._id)
    const b1 = await confirmOrder(admin, (await placeOrder(bella, product))._id)
    const a2 = await confirmOrder(admin, (await placeOrder(adam, product))._id)
    assert.equal(a1.customerOrderNumber, 1)
    assert.equal(b1.customerOrderNumber, 1)
    assert.equal(a2.customerOrderNumber, 2)
    assert.equal(a1.discountAmount, 25)
    assert.equal(b1.discountAmount, 25)
  })
})

describe('reward discount — trust rules, immutability and estimates', () => {
  before(connectTest)
  after(disconnectTest)

  it('ignores client-supplied reward fields and computes everything server-side', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'No Tampering', price: 1000, category: category.slug, stock: 50 })
    const customer = await createCustomerAgent()

    const res = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1, price: 1 }],
      customer: CUSTOMER,
      customerOrderNumber: 10,
      discountPercent: 100,
      discountAmount: 9999,
      subtotal: 1,
      total: 1,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.order.customerOrderNumber, undefined)
    assert.equal(res.body.data.order.discountPercent, 0)
    assert.equal(res.body.data.order.discountAmount, 0)
    assert.equal(res.body.data.order.subtotal, 1000)
    assert.equal(res.body.data.order.total, 1350)

    const confirmed = await confirmOrder(admin, res.body.data.order._id)
    assert.equal(confirmed.customerOrderNumber, 1)
    assert.equal(confirmed.discountPercent, 5)
    assert.equal(confirmed.discountAmount, 50)
    assert.equal(confirmed.total, 1300)
  })

  it('never changes historical orders when new orders arrive', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Immutable', price: 1000, category: category.slug, stock: 50 })
    const customer = await createCustomerAgent()
    const first = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    await confirmOrder(admin, (await placeOrder(customer, product))._id)
    const stored = await Order.findById(first._id).lean()
    assert.equal(stored.customerOrderNumber, 1)
    assert.equal(stored.discountPercent, 5)
    assert.equal(stored.discountAmount, 50)
    assert.equal(stored.total, 1300)
  })

  it('keeps the number + percent immutable on customer edit after confirmation', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Editable', price: 400, category: category.slug, stock: 30 })
    const customer = await createCustomerAgent()

    const pending = await placeOrder(customer, product)
    assert.equal(pending.discountAmount, 0)
    const res = await customer.patch(`/api/orders/${pending._id}`).send({
      items: [{ productId: String(product._id), qty: 3 }],
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.order.subtotal, 1200)
    assert.equal(res.body.data.order.discountPercent, 0)
    assert.equal(res.body.data.order.discountAmount, 0)
    assert.equal(res.body.data.order.total, 1550)

    const confirmed = await confirmOrder(admin, pending._id)
    assert.equal(confirmed.customerOrderNumber, 1)
    assert.equal(confirmed.discountPercent, 5)
    assert.equal(confirmed.discountAmount, 60)
    assert.equal(confirmed.total, 1200 + 350 - 60)
  })

  it('dedupes retried checkouts sharing a clientKey — no extra orders, no extra numbers', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Idempotent', price: 700, category: category.slug, stock: 50 })
    const customer = await createCustomerAgent()
    const body = {
      items: [{ productId: product._id, qty: 1 }],
      customer: CUSTOMER,
      clientKey: `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    const first = await customer.post('/api/orders').send(body)
    assert.equal(first.status, 201)
    const retry = await customer.post('/api/orders').send(body)
    assert.equal(retry.status, 200)
    assert.equal(String(retry.body.data.order._id), String(first.body.data.order._id))
    const confirmed = await confirmOrder(admin, first.body.data.order._id)
    assert.equal(confirmed.customerOrderNumber, 1)
    const me = await customer.get('/api/auth/me')
    const ordered = await Order.countDocuments({ user: me.body.data.user.id, customerOrderNumber: { $ne: null } })
    assert.equal(ordered, 1)
  })

  it('exposes the next reward number via /orders/me', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Peek', price: 100, category: category.slug, stock: 50 })
    const customer = await createCustomerAgent()
    const before = await customer.get('/api/orders/me')
    assert.equal(before.body.data.nextCustomerOrderNumber, 1)
    await confirmOrder(admin, (await placeOrder(customer, product))._id)
    const after = await customer.get('/api/orders/me')
    assert.equal(after.body.data.nextCustomerOrderNumber, 2)
  })
})

describe('reward discount — rejected/cancelled orders never increase the count', () => {
  before(connectTest)
  after(disconnectTest)

  it('rejected and cancelled pending orders consume no number', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Rejected', price: 1000, category: category.slug, stock: 100 })
    const customer = await createCustomerAgent()

    const rejected = await placeOrder(customer, product)
    assert.equal((await admin.patch(`/api/admin/orders/${rejected._id}/status`).send({ status: 'rejected' })).status, 200)

    const cancelled = await placeOrder(customer, product)
    assert.equal((await admin.patch(`/api/admin/orders/${cancelled._id}/status`).send({ status: 'cancelled' })).status, 200)

    const confirmed = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(confirmed.customerOrderNumber, 1)
    assert.equal(confirmed.discountPercent, 5)
    assert.equal(confirmed.discountAmount, 50)

    const rejectedStored = await Order.findById(rejected._id).lean()
    assert.equal(rejectedStored.customerOrderNumber, undefined)
    assert.equal(rejectedStored.discountAmount, 0)
    const cancelledStored = await Order.findById(cancelled._id).lean()
    assert.equal(cancelledStored.customerOrderNumber, undefined)
    assert.equal(cancelledStored.discountAmount, 0)
  })

  it('a confirmed order that is later cancelled still counts (number persists)', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Later Cancelled', price: 1000, category: category.slug, stock: 100 })
    const customer = await createCustomerAgent()

    const first = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(first.customerOrderNumber, 1)
    assert.equal((await admin.patch(`/api/admin/orders/${first._id}/status`).send({ status: 'cancelled' })).status, 200)

    const second = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(second.customerOrderNumber, 2)
  })
})

describe('reward discount — seller products and category ownership', () => {
  before(connectTest)
  after(disconnectTest)

  it('gives sellers no reward even when a seller category is configured', async () => {
    const admin = await createAdminAgent()
    const fixture = await makeSellerRewardCategory()
    const customer = await createCustomerAgent()
    const pending = await placeOrder(customer, fixture.product)
    const confirmed = await confirmOrder(admin, pending._id)
    assert.equal(confirmed.customerOrderNumber, undefined)
    assert.equal(confirmed.discountPercent, 0)
    assert.equal(confirmed.discountAmount, 0)
    assert.equal(confirmed.items[0].discountPercent, 0)
    assert.equal(confirmed.total, 900 + 350)
  })

  it('rejects configuring reward percentages on seller categories', async () => {
    const admin = await createAdminAgent()
    const fixture = await makeSellerRewardCategory()
    const res = await admin.patch(`/api/admin/rewards/categories/${fixture.sellerCat._id}`).send({
      rewardEnabled: true,
      rewardNormalPercent: 10,
      rewardSpecialPercent: 20,
    })
    assert.equal(res.status, 400)
  })

  it('validates percentages: negatives, over 100 and non-numbers are rejected', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ enabled: false })
    const bad = [
      { rewardNormalPercent: -1 },
      { rewardSpecialPercent: 101 },
      { rewardNormalPercent: 'x' },
      { rewardSpecialPercent: null },
    ]
    for (const body of bad) {
      const res = await admin.patch(`/api/admin/rewards/categories/${category._id}`).send(body)
      assert.equal(res.status, 400)
    }
    const ok = await admin.patch(`/api/admin/rewards/categories/${category._id}`).send({
      rewardEnabled: true,
      rewardNormalPercent: 5,
      rewardSpecialPercent: 10,
    })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.data.rewardEnabled, true)
    assert.equal(ok.body.data.rewardNormalPercent, 5)

    const list = await admin.get('/api/admin/rewards')
    assert.equal(list.status, 200)
    assert.ok(list.body.data.categories.some((c) => c.slug === category.slug))
  })
})

describe('reward discount — configuration edge cases', () => {
  before(connectTest)
  after(disconnectTest)

  it('applies NO reward when the system is disabled, then resumes cleanly', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'SysOff', price: 1000, category: category.slug, stock: 100 })
    const customer = await createCustomerAgent()

    try {
      const off = await admin.patch('/api/admin/rewards/settings').send({ rewardSystemEnabled: false })
      assert.equal(off.status, 200)
      const publicRes = await customer.get('/api/rewards')
      assert.equal(publicRes.body.data.enabled, false)
      assert.equal(publicRes.body.data.categories.length, 0)

      const confirmed = await confirmOrder(admin, (await placeOrder(customer, product))._id)
      assert.equal(confirmed.customerOrderNumber, 1)
      assert.equal(confirmed.discountPercent, 0)
      assert.equal(confirmed.discountAmount, 0)
      assert.equal(confirmed.total, 1350)
    } finally {
      await RewardSettings.setEnabled(true)
    }

    const on = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(on.customerOrderNumber, 2)
    assert.equal(on.discountPercent, 5)
    assert.equal(on.discountAmount, 50)
    assert.equal(on.total, 1300)
  })

  it('applies NO reward for disabled or inactive categories', async () => {
    const admin = await createAdminAgent()
    const disabledCat = await makeRewardCategory({ enabled: false, normal: 5, special: 10 })
    const catA = await makeRewardCategory({ normal: 5, special: 10 })
    const inactiveCat = await makeRewardCategory({ enabled: true, normal: 8, special: 15, active: false })
    const pDisabled = await createProduct({ name: 'Disabled Cat', price: 1000, category: disabledCat.slug, stock: 100 })
    const pActive = await createProduct({ name: 'Active Cat', price: 1000, category: catA.slug, stock: 100 })
    const pInactive = await createProduct({ name: 'Inactive Cat', price: 1000, category: inactiveCat.slug, stock: 100 })
    const customer = await createCustomerAgent()

    const first = await confirmOrder(admin, (await placeOrder(customer, pDisabled))._id)
    assert.equal(first.customerOrderNumber, 1)
    assert.equal(first.discountAmount, 0)
    assert.equal(first.items[0].discountPercent, 0)

    const second = await confirmOrder(admin, (await placeOrder(customer, pActive))._id)
    assert.equal(second.customerOrderNumber, 2)
    assert.equal(second.discountAmount, 50)

    const third = await confirmOrder(admin, (await placeOrder(customer, pInactive))._id)
    assert.equal(third.customerOrderNumber, 3)
    assert.equal(third.discountAmount, 0)
  })

  it('snapshots per-item discounts at confirmation (later config changes never rewrite them)', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Snapshot', price: 2000, category: category.slug, stock: 100 })
    const customer = await createCustomerAgent()

    const confirmed = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(confirmed.customerOrderNumber, 1)
    assert.equal(confirmed.items[0].discountPercent, 5)
    assert.equal(confirmed.items[0].discountAmount, 100)

    await admin.patch(`/api/admin/rewards/categories/${category._id}`).send({ rewardNormalPercent: 1, rewardSpecialPercent: 3 })

    const stored = await Order.findById(confirmed._id).lean()
    assert.equal(stored.items[0].discountPercent, 5)
    assert.equal(stored.items[0].discountAmount, 100)
    assert.equal(stored.discountAmount, 100)
    assert.equal(stored.total, 2000 + 350 - 100)

    const after = await confirmOrder(admin, (await placeOrder(customer, product))._id)
    assert.equal(after.customerOrderNumber, 2)
    assert.equal(after.discountAmount, Math.round((2000 * 1) / 100))
  })
})

describe('reward discount + marketer referral + commission', () => {
  before(connectTest)
  after(disconnectTest)

  it('keeps 10% commission on subtotal, AVAILABLE only on delivered, with reward applied on confirm', async () => {
    const admin = await createAdminAgent()
    const category = await makeRewardCategory({ normal: 5, special: 10 })
    const product = await createProduct({ name: 'Referred Reward', price: 10000, category: category.slug, stock: 10 })

    const { user: marketerUser, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: marketerUser._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: `rw-visitor-${Date.now()}`,
    })

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Referred Reward',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: CUSTOMER,
    })
    assert.equal(created.status, 201)
    const id = created.body.data.order._id
    // Subtotal-based commission is independent of the reward discount.
    assert.equal(created.body.data.order.referralAttributed, true)
    assert.equal(created.body.data.order.commissionAmount, 1000)

    const confirmed = await confirmOrder(admin, id)
    assert.equal(confirmed.customerOrderNumber, 1)
    // 5% reward on 10000 = 500; commission stays 10% of subtotal = 1000
    assert.equal(confirmed.discountPercent, 5)
    assert.equal(confirmed.discountAmount, 500)
    assert.equal(confirmed.total, 10000 + 350 - 500)
    // No commission exists at confirmation: commission is only created on delivery.
    assert.equal(await Commission.countDocuments({ order: id }), 0)

    const delivered = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 1)
    const credited = await Commission.findOne({ order: id }).lean()
    assert.equal(credited.amount, 1000)
    assert.equal(await Commission.countDocuments({ order: id }), 1)
  })
})