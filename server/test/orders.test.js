import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, createUser, createMarketer, createProduct, uniquePhone } from './helpers.mjs'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Commission from '../models/Commission.js'
import Referral from '../models/Referral.js'

const phone = uniquePhone

async function registerAgent(name) {
  const number = phone()
  await request(app).post('/api/auth/register').send({ name, phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return { agent, id: (await agent.get('/api/auth/me')).body.data.user.id }
}

async function createCustomerAgent() {
  const number = phone()
  await request(app).post('/api/auth/register').send({ name: 'Customer', phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
}

describe('orders', () => {
  before(connectTest)
  after(disconnectTest)

  it('creates an order with server-computed totals', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Saffron 5g', price: 800, stock: 10 })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2, price: 1 }],
      customer: {
        fullName: 'Ahmed Benali',
        phone: '+213 555 12 34 56',
        wilaya: '16',
        wilayaName: 'Alger',
        commune: 'Bab Ezzouar',
        address: 'CitÃ© 5 Juillet, Bat B',
        note: 'Call before delivery',
      },
    })
    assert.equal(res.status, 201)
    assert.match(res.body.data.order.orderRef, /^BM-[0-9A-F]{6}$/)
    assert.equal(res.body.data.order.subtotal, 1600)
    assert.equal(res.body.data.order.delivery, 350)
    assert.equal(res.body.data.order.total, 1950)
    assert.equal(res.body.data.order.status, 'pending-review')
  })

  it('charges a flat delivery fee on every order', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Expensive Product', price: 1400, stock: 5 })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2, price: 1 }],
      customer: {
        fullName: 'Sara Larbi',
        phone: '+213 555 12 34 56',
        wilaya: '16',
        commune: 'Alger Centre',
        address: 'Rue Didouche',
      },
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.order.delivery, 350)
    assert.equal(res.body.data.order.total, res.body.data.order.subtotal + 350)
  })

  it('uses server price, ignoring client-supplied price', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Price Check', price: 500, stock: 3 })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1, price: 1 }],
      customer: {
        fullName: 'Client',
        phone: '0550',
        wilaya: '16',
        commune: 'X',
        address: 'Y',
      },
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.order.items[0].price, 500)
  })

  it('rejects an order exceeding stock', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Low Stock', price: 300, stock: 2 })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 5 }],
      customer: {
        fullName: 'Client',
        phone: '0550',
        wilaya: '16',
        commune: 'X',
        address: 'Y',
      },
    })
    assert.equal(res.status, 400)
  })

  it('rejects an inactive product', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Inactive', price: 300, stock: 10, isActive: false })
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'C', phone: '0', wilaya: '16', commune: 'X', address: 'Y' },
    })
    assert.equal(res.status, 400)
  })

  it('rejects invalid orders', async () => {
    const agent = await createCustomerAgent()
    const tombstones = [
      { items: [], customer: {} },
      {},
      { items: [{}], customer: {} },
      { items: [], customer: null },
    ]
    for (const body of tombstones) {
      const res = await agent.post('/api/orders').send(body)
      assert.equal(res.status, 400)
    }
  })

  it('rejects unauthenticated order creation', async () => {
    const res = await request(app).post('/api/orders').send({
      items: [{ productId: '000000000000000000000000', qty: 1 }],
      customer: { fullName: 'X', phone: '0', wilaya: '16', commune: 'X', address: 'Y' },
    })
    assert.equal(res.status, 401)
  })

  it('links an order to a logged-in customer and exposes it via /orders/me', async () => {
    const { agent, id } = await registerAgent('Ordering Customer')
    const product = await createProduct({ name: 'Linked', price: 100, stock: 5 })
    await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'C', phone: '0', wilaya: '16', commune: 'Bab Ezzouar', address: 'X' },
    })
    const mine = await agent.get('/api/orders/me')
    assert.equal(mine.status, 200)
    assert.equal(mine.body.data.orders.length, 1)
    assert.equal(String(mine.body.data.orders[0].user), id)
  })

  it('keeps /orders/me private', async () => {
    const res = await request(app).get('/api/orders/me')
    assert.equal(res.status, 401)
  })
})

describe('admin order management + product CRUD', () => {
  before(connectTest)
  after(disconnectTest)

  it('lets admin create, update and delete products', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const created = await admin.post('/api/admin/products').send({
      name: 'Admin Product',
      price: 1200,
      category: 'spices',
      categoryName: 'Spices',
      stock: 20,
      isRewardEligible: true,
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.stock, 20)
    assert.equal(created.body.data.isRewardEligible, true)
    const id = created.body.data._id

    const updated = await admin.patch(`/api/admin/products/${id}`).send({ stock: 15, isFeatured: true })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.stock, 15)
    assert.equal(updated.body.data.isFeatured, true)

    const toggled = await admin.patch(`/api/admin/products/${id}/toggle`).send({ isActive: false })
    assert.equal(toggled.status, 200)
    assert.equal(toggled.body.data.isActive, false)

    const deleted = await admin.delete(`/api/admin/products/${id}`)
    assert.equal(deleted.status, 200)
  })

  it('rejects product without required fields', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })
    const res = await admin.post('/api/admin/products').send({ name: '', price: 0 })
    assert.equal(res.status, 400)
  })

  it('lists and updates any order', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const product = await createProduct({ name: 'Ordered', price: 100, stock: 5 })
    const order = await admin.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'C', phone: '0', wilaya: '16', commune: 'X', address: 'Y' },
    })
    const id = order.body.data.order._id
    const stockBefore = (await Product.findById(product._id)).stock
    const salesBefore = (await Product.findById(product._id)).confirmedSales

    const list = await admin.get('/api/admin/orders')
    assert.equal(list.status, 200)
    assert.ok(list.body.data.orders.find((o) => String(o._id) === String(id)))

    const done = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'confirmed' })
    assert.equal(done.status, 200)
    assert.equal(done.body.data.order.status, 'confirmed')

    const stockAfter = (await Product.findById(product._id)).stock
    assert.equal(stockAfter, stockBefore - 1)
    const salesAfter = (await Product.findById(product._id)).confirmedSales
    assert.equal(salesAfter, salesBefore + 1)
  })

  it('enforces the order state machine', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const product = await createProduct({ name: 'Flow', price: 100, stock: 5 })
    const order = await admin.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { fullName: 'C', phone: '0', wilaya: '16', commune: 'X', address: 'Y' },
    })
    const id = order.body.data.order._id

    const bad = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(bad.status, 400)

    const ok = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'confirmed' })
    assert.equal(ok.status, 200)

    const impossible = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'shipped' })
    assert.equal(impossible.status, 400)

    const processing = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'processing' })
    assert.equal(processing.status, 200)

    const shipped = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'shipped' })
    assert.equal(shipped.status, 200)

    const delivered = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
  })
})

describe('admin marketer management', () => {
  before(connectTest)
  after(disconnectTest)

  it('lists marketers and records payouts against available commissions', async () => {
    const { phone: adminPhone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone: adminPhone, password })

    const { user, profile } = await createMarketer()

    const list = await admin.get('/api/admin/marketers')
    assert.equal(list.status, 200)
    assert.ok(list.body.data.marketers.find((m) => m.id === String(user._id)))

    const referral = await Referral.create({
      marketer: user._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'payout-visitor',
    })

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Referred Customer',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Payout Product', price: 1000, stock: 10 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2 }],
      customer: { fullName: 'Referred Customer', phone: '+213 555 12 34 56', wilaya: '16', commune: 'X', address: 'Y' },
    })
    assert.equal(order.status, 201)
    const orderId = order.body.data.order._id
    assert.equal(order.body.data.order.referralAttributed, true)
    assert.equal(order.body.data.order.commissionAmount, 200)

    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' })
    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'processing' })
    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'shipped' })
    const delivered = await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
    assert.equal((await Commission.countDocuments({ order: orderId, status: 'AVAILABLE' })), 1)

    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.stats.availableBalance, 200)

    const payout = await admin.post('/api/admin/payouts').send({
      marketerId: user._id,
      amount: 200,
      method: 'CCP',
      reference: 'REF-001',
    })
    assert.equal(payout.status, 201)
    assert.equal(payout.body.data.amount, 200)
    assert.equal(payout.body.data.method, 'CCP')
    assert.equal(payout.body.data.status, 'sent')
    assert.equal(payout.body.data.commissions.length, 1)
  })

  it('suspends and deletes a marketer', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const { user, profile } = await createMarketer()

    const suspended = await admin.patch(`/api/admin/marketers/${profile._id}/status`).send({ status: 'suspended' })
    assert.equal(suspended.status, 200)
    assert.equal(suspended.body.data.status, 'suspended')

    const del = await admin.delete(`/api/admin/marketers/${user._id}`)
    assert.equal(del.status, 200)
    assert.equal(await User.findById(user._id), null)
  })

  it('refuses to delete a non-marketer or self', async () => {
    const { phone, password, user: adminUser } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const self = await admin.delete(`/api/admin/marketers/${adminUser._id}`)
    assert.equal(self.status, 400)

    const { user: regular } = await createUser()
    const notMarketer = await admin.delete(`/api/admin/marketers/${regular._id}`)
    assert.equal(notMarketer.status, 400)
  })
})

describe('marketer authorization', () => {
  before(connectTest)
  after(disconnectTest)

  it('blocks MARKETER from mutating products', async () => {
    const { phone, password } = await createUser({ name: 'M', role: 'MARKETER' })
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })

    const create = await agent.post('/api/admin/products').send({ name: 'X', price: 1, category: 'spices' })
    assert.equal(create.status, 403)

    const product = await createProduct()
    const update = await agent.patch(`/api/admin/products/${product._id}`).send({ price: 2 })
    assert.equal(update.status, 403)
  })
})
