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
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Order from '../models/Order.js'

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
    // Pending orders carry no reward yet: the number + discount are assigned
    // server-side only when a store/admin confirms the order.
    assert.equal(res.body.data.order.customerOrderNumber, undefined)
    assert.equal(res.body.data.order.discountPercent, 0)
    assert.equal(res.body.data.order.discountAmount, 0)
    assert.equal(res.body.data.order.total, 1950)
    assert.equal(res.body.data.order.status, 'pending')
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
    assert.equal(
      res.body.data.order.total,
      res.body.data.order.subtotal + 350 - res.body.data.order.discountAmount,
    )
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

describe('customer order edit + delete while pending', () => {
  before(connectTest)
  after(disconnectTest)

  const customerInfo = { fullName: 'C', phone: '0', wilaya: '16', commune: 'X', address: 'Y' }

  async function customerOrder(agent, product, qty = 1) {
    const res = await agent.post('/api/orders').send({
      items: [{ productId: product._id, qty }],
      customer: customerInfo,
    })
    assert.equal(res.status, 201)
    return res.body.data.order
  }

  it('lets the owner edit delivery info while pending', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Editable', price: 400, stock: 5 })
    const order = await customerOrder(agent, product)
    const res = await agent.patch(`/api/orders/${order._id}`).send({
      customer: { commune: 'New Commune', address: 'New Address', note: 'Leave at door' },
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.order.customer.commune, 'New Commune')
    assert.equal(res.body.data.order.customer.address, 'New Address')
    assert.equal(res.body.data.order.customer.note, 'Leave at door')
    assert.equal(res.body.data.order.status, 'pending')
  })

  it('recomputes totals server-side when quantities change', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Qty Edit', price: 500, stock: 10 })
    const order = await customerOrder(agent, product, 1)
    const res = await agent.patch(`/api/orders/${order._id}`).send({
      items: [{ productId: String(product._id), qty: 3, price: 1 }],
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.order.items[0].qty, 3)
    assert.equal(res.body.data.order.items[0].price, 500)
    assert.equal(res.body.data.order.subtotal, 1500)
    // Still pending: no reward number/discount yet -> total = subtotal + fee
    assert.equal(res.body.data.order.discountPercent, 0)
    assert.equal(res.body.data.order.discountAmount, 0)
    assert.equal(res.body.data.order.total, 1850)
  })

  it('rejects quantity edits exceeding stock', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Scarce Edit', price: 200, stock: 2 })
    const order = await customerOrder(agent, product, 1)
    const res = await agent.patch(`/api/orders/${order._id}`).send({
      items: [{ productId: String(product._id), qty: 9 }],
    })
    assert.equal(res.status, 400)
  })

  it('blocks edits from other users and guests', async () => {
    const owner = await createCustomerAgent()
    const stranger = await createCustomerAgent()
    const product = await createProduct({ name: 'Private', price: 100, stock: 5 })
    const order = await customerOrder(owner, product)
    const strangerRes = await stranger.patch(`/api/orders/${order._id}`).send({ customer: { commune: 'Z' } })
    assert.equal(strangerRes.status, 404)
    const guestRes = await request(app).patch(`/api/orders/${order._id}`).send({ customer: { commune: 'Z' } })
    assert.equal(guestRes.status, 401)
  })

  it('blocks edit and delete once the order is confirmed', async () => {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })

    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Locked', price: 100, stock: 5 })
    const order = await customerOrder(agent, product)

    const confirmed = await admin.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'confirmed' })
    assert.equal(confirmed.status, 200)

    const edit = await agent.patch(`/api/orders/${order._id}`).send({ customer: { commune: 'Too Late' } })
    assert.equal(edit.status, 400)
    const del = await agent.delete(`/api/orders/${order._id}`)
    assert.equal(del.status, 400)
  })

  it('lets the owner delete a pending order', async () => {
    const agent = await createCustomerAgent()
    const product = await createProduct({ name: 'Deletable', price: 100, stock: 5 })
    const order = await customerOrder(agent, product)
    const del = await agent.delete(`/api/orders/${order._id}`)
    assert.equal(del.status, 200)
    const mine = await agent.get('/api/orders/me')
    assert.ok(!mine.body.data.orders.find((o) => String(o._id) === String(order._id)))
  })

  it('blocks delete from other users', async () => {
    const owner = await createCustomerAgent()
    const stranger = await createCustomerAgent()
    const product = await createProduct({ name: 'Not Yours', price: 100, stock: 5 })
    const order = await customerOrder(owner, product)
    const res = await stranger.delete(`/api/orders/${order._id}`)
    assert.equal(res.status, 404)
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
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.stock, 20)
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

    const noProcessing = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'processing' })
    assert.equal(noProcessing.status, 400)

    const delivered = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)

    const again = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(again.status, 400)

    const rejectedAfter = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'rejected' })
    assert.equal(rejectedAfter.status, 400)
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

describe('admin order workflow + single commission', () => {
  before(connectTest)
  after(disconnectTest)

  it('walks pending -> delivered and releases commission exactly once', async () => {
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
      visitor: 'workflow-visitor',
    })

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Workflow Customer',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Workflow Product', price: 1000, stock: 10 })
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2 }],
      customer: { fullName: 'Workflow Customer', phone: '+213 555 00 00 00', wilaya: '16', commune: 'X', address: 'Y' },
    })
    assert.equal(created.status, 201)
    const id = created.body.data.order._id
    assert.equal(created.body.data.order.status, 'pending')

    for (const status of ['confirmed', 'delivered']) {
      const res = await admin.patch(`/api/admin/orders/${id}/status`).send({ status })
      assert.equal(res.status, 200)
      assert.equal(res.body.data.order.status, status)
    }

    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 1)
    const detail = await admin.get(`/api/admin/marketers/${marketerUser._id}`)
    assert.equal(detail.body.data.stats.availableBalance, 200)

    // Re-delivering must fail and must not duplicate the commission.
    const again = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(again.status, 400)
    assert.equal(await Commission.countDocuments({ order: id }), 1)
    const detail2 = await admin.get(`/api/admin/marketers/${marketerUser._id}`)
    assert.equal(detail2.body.data.stats.availableBalance, 200)

    // The customer sees the final status.
    const mine = await customer.get('/api/orders/me')
    assert.equal(mine.body.data.orders.find((o) => String(o._id) === String(id)).status, 'delivered')
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

describe('admin + seller order deletion', () => {
  before(connectTest)
  after(disconnectTest)

  const customerInfo = { fullName: 'Del', phone: '0', wilaya: '16', commune: 'X', address: 'Y' }

  async function adminAgent() {
    const { phone, password } = await createAdmin()
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ phone, password })
    return admin
  }

  async function adminOrder(admin, product, qty = 1) {
    const res = await admin.post('/api/orders').send({
      items: [{ productId: product._id, qty }],
      customer: customerInfo,
    })
    assert.equal(res.status, 201)
    return res.body.data.order
  }

  it('admin deletes a pending order', async () => {
    const admin = await adminAgent()
    const product = await createProduct({ name: 'Del Pending', price: 100, stock: 5 })
    const order = await adminOrder(admin, product)

    const del = await admin.delete(`/api/admin/orders/${order._id}`)
    assert.equal(del.status, 200)
    assert.equal(await Order.countDocuments({ _id: order._id }), 0)
  })

  it('admin delete of a confirmed order restores stock and confirmedSales', async () => {
    const admin = await adminAgent()
    const product = await createProduct({ name: 'Del Confirmed', price: 100, stock: 10 })
    const order = await adminOrder(admin, product, 3)

    const confirmed = await admin.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'confirmed' })
    assert.equal(confirmed.status, 200)
    assert.equal((await Product.findById(product._id)).stock, 7)
    assert.equal((await Product.findById(product._id)).confirmedSales, 3)

    const del = await admin.delete(`/api/admin/orders/${order._id}`)
    assert.equal(del.status, 200)
    assert.equal((await Product.findById(product._id)).stock, 10)
    assert.equal((await Product.findById(product._id)).confirmedSales, 0)
    assert.equal(await Order.countDocuments({ _id: order._id }), 0)
  })

  it('admin delete of a delivered referral order cancels the released commission', async () => {
    const admin = await adminAgent()
    const { user: marketerUser, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: marketerUser._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'del-referral',
    })

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Deleting Referral Customer',
      phone: customerPhone,
      password: 'Secret@1234',
      referralId: referral._id,
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Del Referral', price: 1000, stock: 10 })
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2 }],
      customer: customerInfo,
    })
    assert.equal(created.status, 201)
    const id = created.body.data.order._id

    await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'confirmed' })
    const delivered = await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 1)
    assert.equal((await MarketerProfile.findById(profile._id)).totalEarnings, 200)

    const del = await admin.delete(`/api/admin/orders/${id}`)
    assert.equal(del.status, 200)
    assert.equal(await Commission.countDocuments({ order: id, status: 'AVAILABLE' }), 0)
    assert.equal(await Commission.countDocuments({ order: id, status: 'CANCELLED' }), 1)
    assert.equal((await MarketerProfile.findById(profile._id)).totalEarnings, 0)
    const after = await admin.get(`/api/admin/marketers/${marketerUser._id}`)
    assert.equal(after.body.data.stats.availableBalance, 0)
  })

  it('seller deletes only their own store order and restores stock on confirmed', async () => {
    const admin = await adminAgent()

    const makeSeller = async (suffix) => {
      const number = uniquePhone()
      await request(app).post('/api/seller/register').send({
        fullName: `Seller ${suffix}`,
        email: `seller-${suffix}-${number}@test.dev`,
        phone: number,
        password: 'Secret@1234',
        confirmPassword: 'Secret@1234',
      })
      const agent = request.agent(app)
      const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
      assert.equal(login.status, 200)
      const seller = await Seller.findOne({ phone: number.replace(/[\s-]+/g, '') }).lean()
      const store = await Store.create({
        seller: seller._id,
        name: `Store ${suffix}`,
        slug: `store-${suffix}-${Date.now()}`,
        status: 'active',
        subscriptionEndDate: new Date(Date.now() + 86400000 * 30),
      })
      const product = await createProduct({ name: `Prod ${suffix}`, price: 500, stock: 10 })
      await Product.updateOne({ _id: product._id }, { $set: { ownerType: 'SELLER', store: store._id, seller: seller._id } })
      return { agent, store, product }
    }

    const sellerA = await makeSeller('A')
    const sellerB = await makeSeller('B')

    const customerPhone = uniquePhone()
    await request(app).post('/api/auth/register').send({
      name: 'Seller Customer',
      phone: customerPhone,
      password: 'Secret@1234',
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: customerPhone, password: 'Secret@1234' })

    const created = await customer.post('/api/orders').send({
      items: [{ productId: sellerA.product._id, qty: 2 }],
      customer: customerInfo,
    })
    assert.equal(created.status, 201)
    const orderId = created.body.data.order._id

    // Confirm it as admin, stock is decremented by 2.
    const confirmed = await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' })
    assert.equal(confirmed.status, 200)
    assert.equal((await Product.findById(sellerA.product._id)).stock, 8)

    // Seller B must not be able to delete A's order.
    const wrongDelete = await sellerB.agent.delete(`/api/store/orders/${orderId}`)
    assert.equal(wrongDelete.status, 404)

    // Seller A deletes its own order: stock restored.
    const ownDelete = await sellerA.agent.delete(`/api/store/orders/${orderId}`)
    assert.equal(ownDelete.status, 200)
    assert.equal(await Order.countDocuments({ _id: orderId }), 0)
    assert.equal((await Product.findById(sellerA.product._id)).stock, 10)
    assert.equal((await Product.findById(sellerA.product._id)).confirmedSales, 0)
  })
})
