import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import {
  connectTest,
  disconnectTest,
  createAdmin,
  createMarketer,
  createProduct,
  uniquePhone,
} from './helpers.mjs'
import Commission from '../models/Commission.js'
import Order from '../models/Order.js'
import Referral from '../models/Referral.js'

const CUSTOMER = { fullName: 'Ahmed Benali', phone: '+213 555 12 34 56', wilaya: '16', commune: 'X', address: 'Y' }

async function createCustomerAgent(name = 'Discount Customer') {
  const number = uniquePhone()
  await request(app).post('/api/auth/register').send({ name, phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
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

describe('customer order discount (5% / every 10th 7%)', () => {
  before(connectTest)
  after(disconnectTest)

  it('gives 5% on orders 1-9, 7% on #10, 5% on #11', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Discount Ladder', price: 1000, stock: 100 })
    const seen = []
    for (let i = 1; i <= 11; i += 1) {
      seen.push(await placeOrder(agent, product))
    }
    for (let i = 0; i < 11; i += 1) {
      const expectedNumber = i + 1
      const expectedPercent = expectedNumber === 10 ? 7 : 5
      assert.equal(seen[i].customerOrderNumber, expectedNumber)
      assert.equal(seen[i].discountPercent, expectedPercent)
      assert.equal(seen[i].discountAmount, expectedPercent === 7 ? 70 : 50)
      assert.equal(seen[i].subtotal, 1000)
      assert.equal(seen[i].total, 1000 + 350 - seen[i].discountAmount)
    }
  })

  it('gives 7% on #20', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Twenty Ladder', price: 2000, stock: 100 })
    let last = null
    for (let i = 1; i <= 20; i += 1) {
      last = await placeOrder(agent, product)
    }
    assert.equal(last.customerOrderNumber, 20)
    assert.equal(last.discountPercent, 7)
    assert.equal(last.discountAmount, 140)
    assert.equal(last.total, 2000 + 350 - 140)
  })

  it('keeps independent personal sequences per customer', async () => {
    const product = await createProduct({ name: 'Independent Seq', price: 500, stock: 50 })
    const adam = await createCustomerAgent('Adam')
    const bella = await createCustomerAgent('Bella')
    const a1 = await placeOrder(adam, product)
    const b1 = await placeOrder(bella, product)
    const a2 = await placeOrder(adam, product)
    assert.equal(a1.customerOrderNumber, 1)
    assert.equal(b1.customerOrderNumber, 1)
    assert.equal(a2.customerOrderNumber, 2)
    assert.equal(a1.discountPercent, 5)
    assert.equal(b1.discountPercent, 5)
  })

  it('ignores client-supplied discount / totals / order numbers', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'No Tampering', price: 1000, stock: 10 })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1, price: 1 }],
      customer: CUSTOMER,
      customerOrderNumber: 10,
      discountPercent: 100,
      discountAmount: 9999,
      subtotal: 1,
      total: 1,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.order.customerOrderNumber, 1)
    assert.equal(res.body.data.order.discountPercent, 5)
    assert.equal(res.body.data.order.discountAmount, 50)
    assert.equal(res.body.data.order.subtotal, 1000)
    assert.equal(res.body.data.order.total, 1300)
  })

  it('never changes historical orders when new orders arrive', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Immutable History', price: 1000, stock: 50 })
    const first = await placeOrder(agent, product)
    await placeOrder(agent, product)
    const stored = await Order.findById(first._id).lean()
    assert.equal(stored.customerOrderNumber, 1)
    assert.equal(stored.discountPercent, 5)
    assert.equal(stored.discountAmount, 50)
    assert.equal(stored.total, 1300)
  })

  it('keeps number + percent on customer edit, recomputing only the amount', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Editable Discount', price: 400, stock: 20 })
    const order = await placeOrder(agent, product, 1)
    assert.equal(order.discountAmount, 20)
    const res = await agent.patch(`/api/orders/${order._id}`).send({
      items: [{ productId: String(product._id), qty: 3 }],
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.order.customerOrderNumber, order.customerOrderNumber)
    assert.equal(res.body.data.order.discountPercent, 5)
    assert.equal(res.body.data.order.subtotal, 1200)
    assert.equal(res.body.data.order.discountAmount, 60)
    assert.equal(res.body.data.order.total, 1200 + 350 - 60)
  })

  it('dedupes retried checkouts sharing a clientKey', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Idempotent', price: 700, stock: 20 })
    const body = {
      items: [{ productId: product._id, qty: 1 }],
      customer: CUSTOMER,
      clientKey: `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    const first = await agent.post('/api/orders').send(body)
    assert.equal(first.status, 201)
    const retry = await agent.post('/api/orders').send(body)
    assert.equal(retry.status, 200)
    assert.equal(retry.body.data.deduped, true)
    assert.equal(String(retry.body.data.order._id), String(first.body.data.order._id))
    const count = await Order.countDocuments({ user: (await agent.get('/api/auth/me')).body.data.user.id })
    assert.equal(count, 1)
  })

  it('consumes the number permanently on cancelled orders (no reuse)', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Cancelled Keeps Number', price: 900, stock: 20 })
    const first = await placeOrder(agent, product)
    assert.equal(first.customerOrderNumber, 1)
    const cancelled = await admin.patch(`/api/admin/orders/${first._id}/status`).send({ status: 'cancelled' })
    assert.equal(cancelled.status, 200)
    const second = await placeOrder(agent, product)
    assert.equal(second.customerOrderNumber, 2)
    const storedFirst = await Order.findById(first._id).lean()
    assert.equal(storedFirst.discountPercent, 5)
    assert.equal(storedFirst.discountAmount, 45)
  })

  it('exposes the next order number + discount via /orders/me', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Peek Next', price: 100, stock: 20 })
    const before = await agent.get('/api/orders/me')
    assert.equal(before.body.data.nextCustomerOrderNumber, 1)
    assert.equal(before.body.data.nextDiscountPercent, 5)
    await placeOrder(agent, product)
    const after = await agent.get('/api/orders/me')
    assert.equal(after.body.data.nextCustomerOrderNumber, 2)
    assert.equal(after.body.data.nextDiscountPercent, 5)
  })
})

describe('discount + marketer referral + commission', () => {
  before(connectTest)
  after(disconnectTest)

  it('keeps 10% commission on subtotal, AVAILABLE only on delivered, exactly once', async () => {
    const { phone: adminPhone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone: adminPhone, password })

    const { user: marketerUser, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: marketerUser._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: `discount-visitor-${Date.now()}`,
    })

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Referred Discounter',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Referred Discount', price: 10000, stock: 10 })
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'Referred Discounter', phone: '+213 555 00 00 00', wilaya: '16', commune: 'X', address: 'Y' },
    })
    assert.equal(created.status, 201)
    const id = created.body.data.order._id
    // 5% customer discount on 10000 = 500; commission stays 10% of subtotal = 1000
    assert.equal(created.body.data.order.discountPercent, 5)
    assert.equal(created.body.data.order.discountAmount, 500)
    assert.equal(created.body.data.order.total, 10000 + 350 - 500)
    assert.equal(created.body.data.order.referralAttributed, true)
    assert.equal(created.body.data.order.commissionAmount, 1000)
    assert.equal(await Commission.countDocuments({ order: id, status: 'PENDING' }), 1)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 0)

    for (const status of ['confirmed', 'processing', 'shipped']) {
      const res = await admin.patch(`/api/admin/orders/${id}/status`).send({ status })
      assert.equal(res.status, 200)
      assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 0)
    }
    const delivered = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 1)
    assert.equal(await Commission.countDocuments({ order: id }), 1)

    const again = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(again.status, 400)
    assert.equal(await Commission.countDocuments({ order: id }), 1)
  })

  it('grants no commission on cancelled referral orders', async () => {
    const { phone: adminPhone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone: adminPhone, password })

    const { user: marketerUser, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: marketerUser._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: `cancel-visitor-${Date.now()}`,
    })
    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Cancelled Referred',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Cancelled Referred', price: 1000, stock: 10 })
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'Cancelled Referred', phone: '0', wilaya: '16', commune: 'X', address: 'Y' },
    })
    const id = created.body.data.order._id
    const cancelled = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'cancelled' })
    assert.equal(cancelled.status, 200)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 0)
    assert.equal(await Commission.countDocuments({ order: id, status: 'CANCELLED' }), 1)
  })
})
