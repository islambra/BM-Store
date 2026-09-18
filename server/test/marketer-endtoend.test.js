import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, createProduct, uniquePhone } from './helpers.mjs'
import User from '../models/User.js'
import MarketerProfile from '../models/MarketerProfile.js'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'

const phone = uniquePhone

async function adminAgent() {
  const { phone: p, password } = await createAdmin()
  const admin = request.agent(app)
  await admin.post('/api/auth/login').send({ phone: p, password })
  return admin
}

function deliveryInfo(name = 'Referred Customer') {
  return { fullName: name, phone: '+213 555 12 34 56', wilaya: '16', commune: 'X', address: 'Y' }
}

const DAY = 24 * 60 * 60 * 1000

describe('marketer end-to-end via public API routes', () => {
  before(connectTest)
  after(disconnectTest)

  it('full journey: register-marketer → env-based link → track → customer → order → delivered → 10% commission → payout → confirm', async () => {
    // 1) Marketer creates their account through the real public route.
    const mPhone = phone()
    const reg = await request(app).post('/api/auth/register-marketer').send({
      name: 'E2E Marketer',
      phone: mPhone,
      password: 'Secret@1234',
      baridiMob: `0699${mPhone.slice(-6)}`,
    })
    assert.equal(reg.status, 201)
    const code = reg.body.data.marketer.referralCode
    assert.match(code, /^[A-Z0-9]{10}$/)
    assert.match(reg.body.data.marketer.referralLink, new RegExp(`\\?ref=${code}$`))

    const marketer = await User.findOne({ phone: mPhone }).lean()
    const mAgent = request.agent(app)
    const login = await mAgent.post('/api/auth/login').send({ phone: mPhone, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    // 2) Referral links are generated from the environment, never hardcoded.
    const originalBase = process.env.APP_BASE_URL
    process.env.APP_BASE_URL = 'https://bm-partners.example.com'
    try {
      const me = await mAgent.get('/api/marketer/me')
      assert.equal(me.status, 200)
      assert.equal(me.body.data.baseUrl, 'https://bm-partners.example.com')
      assert.equal(me.body.data.profile.referralLink, `https://bm-partners.example.com/?ref=${code}`)
    } finally {
      process.env.APP_BASE_URL = originalBase
    }

    // 3) A visitor opens the referral link → visit recorded with a ~7-day window.
    const track = await request(app).post('/api/marketing/track').send({
      referralCode: code,
      visitorId: 'e2e-visitor',
      path: '/',
    })
    assert.equal(track.status, 201)
    const referralId = track.body.data.referralId
    const expiresAt = new Date(track.body.data.expiresAt).getTime()
    const now = Date.now()
    assert.ok(expiresAt > now + 6 * DAY, 'expiry window is about 7 days')
    assert.ok(expiresAt <= now + 7 * DAY + 5000, 'expiry window does not exceed 7 days')

    // 4) The visitor registers → the account becomes the referral's customer.
    const cPhone = phone()
    const regCustomer = await request(app).post('/api/auth/register').send({
      name: 'E2E Customer',
      phone: cPhone,
      password: 'Secret@1234',
      referralId,
      visitorId: 'e2e-visitor',
    })
    assert.equal(regCustomer.status, 201)
    const linked = await Referral.findById(referralId).lean()
    assert.equal(linked.converted, true)
    assert.equal(String(linked.customer), regCustomer.body.data.user.id)
    assert.equal(linked.active, true)

    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: cPhone, password: 'Secret@1234' })

    // 5) The customer orders a BM Store product within the window.
    const product = await createProduct({ name: 'E2E Saffron', price: 2500, stock: 10 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 2 }],
      customer: deliveryInfo('E2E Customer'),
      visitorId: 'e2e-visitor',
    })
    assert.equal(order.status, 201)
    assert.equal(order.body.data.order.referralAttributed, true)
    assert.equal(String(order.body.data.order.marketer), String(marketer._id))
    assert.equal(order.body.data.order.commissionAmount, 500) // 10% of 5000 subtotal

    // 6) Nothing is earned or credited before delivery.
    assert.equal(await Commission.countDocuments({ marketer: marketer._id }), 0)

    // 7) Confirm → deliver → commission credited exactly once at 10%.
    const admin = await adminAgent()
    await admin.patch(`/api/admin/orders/${order.body.data.order._id}/status`).send({ status: 'confirmed' })
    const delivered = await admin.patch(`/api/admin/orders/${order.body.data.order._id}/status`).send({ status: 'delivered' })
    assert.equal(delivered.status, 200)
    const commission = await Commission.findOne({ order: order.body.data.order._id }).lean()
    assert.ok(commission)
    assert.equal(commission.status, 'AVAILABLE')
    assert.equal(commission.amount, 500)

    // 8) Marketer dashboard stats match the database exactly.
    const me = await mAgent.get('/api/marketer/me')
    assert.equal(me.body.data.stats.visits, await Referral.countDocuments({ marketer: marketer._id }))
    assert.equal(me.body.data.stats.customers, await Referral.countDocuments({ marketer: marketer._id, converted: true }))
    assert.equal(me.body.data.stats.orders, await Order.countDocuments({ marketer: marketer._id }))
    assert.equal(me.body.data.stats.deliveredOrders, await Order.countDocuments({ marketer: marketer._id, status: 'delivered' }))
    assert.equal(me.body.data.stats.visits, 1)
    assert.equal(me.body.data.stats.customers, 1)
    assert.equal(me.body.data.stats.orders, 1)
    assert.equal(me.body.data.stats.deliveredOrders, 1)
    assert.equal(me.body.data.stats.availableBalance, 500)
    assert.equal(me.body.data.stats.pendingEarnings, 0)

    // 9) Admin sees the marketer balance and records a payout.
    const list = await admin.get('/api/admin/marketers')
    const row = list.body.data.marketers.find((m) => String(m.id) === String(marketer._id))
    assert.ok(row)
    assert.equal(row.stats.availableBalance, 500)

    const payout = await admin.post('/api/admin/payouts').send({
      marketerId: marketer._id,
      amount: 500,
      method: 'CCP',
      reference: 'E2E-PAY',
    })
    assert.equal(payout.status, 201)
    const payoutId = payout.body.data._id

    // Reserved commissions still count toward the balance until confirmed.
    const reserved = await mAgent.get('/api/marketer/me')
    assert.equal(reserved.body.data.stats.availableBalance, 500)
    assert.equal(reserved.body.data.stats.payoutRequested, 500)

    // 10) Marketer confirms receipt → balance 0, history preserved, commission RECEIVED.
    const confirmed = await mAgent.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(confirmed.status, 200)
    const after = await mAgent.get('/api/marketer/me')
    assert.equal(after.body.data.stats.availableBalance, 0)
    assert.equal(after.body.data.stats.payoutRequested, 0)
    assert.equal(after.body.data.stats.totalPaid, 500)

    const payments = await mAgent.get('/api/marketer/payments')
    assert.equal(payments.body.data.payouts.length, 1)
    assert.equal(payments.body.data.payouts[0].status, 'received')

    const finalCommission = await Commission.findOne({ order: order.body.data.order._id }).lean()
    assert.equal(finalCommission.status, 'RECEIVED')
  })

  it('seller-store products never receive marketer attribution or commission', async () => {
    // A marketer with an active, in-window referral whose visitor becomes a customer.
    const mPhone = phone()
    await request(app).post('/api/auth/register-marketer').send({
      name: 'Seller Mkt',
      phone: mPhone,
      password: 'Secret@1234',
    })
    const marketer = await User.findOne({ phone: mPhone }).lean()
    const profile = await MarketerProfile.findOne({ user: marketer._id }).lean()

    const track = await request(app).post('/api/marketing/track').send({
      referralCode: profile.referralCode,
      visitorId: 'seller-e2e-visitor',
    })
    assert.equal(track.status, 201)
    const referralId = track.body.data.referralId

    const cPhone = phone()
    await request(app).post('/api/auth/register').send({
      name: 'Seller Cust',
      phone: cPhone,
      password: 'Secret@1234',
      referralId,
      visitorId: 'seller-e2e-visitor',
    })
    const customer = request.agent(app)
    await customer.post('/api/auth/login').send({ phone: cPhone, password: 'Secret@1234' })

    // Seller store with an active subscription + a seller product.
    const sellerNumber = phone()
    const sellerReg = await request(app).post('/api/seller/register').send({
      fullName: 'E2E Store Owner',
      email: `e2e-seller-${Date.now()}@test.dev`,
      phone: sellerNumber,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    assert.equal(sellerReg.status, 201)
    const seller = await Seller.findOne({ phone: sellerNumber.replace(/[\s-]+/g, '') }).lean()
    const store = await Store.create({
      seller: seller._id,
      name: 'E2E Seller Store',
      slug: `e2e-store-${Date.now()}`,
      status: 'active',
      subscriptionEndDate: new Date(Date.now() + 30 * DAY),
    })
    const sellerProduct = await createProduct({ name: 'E2E Seller Product', price: 1000, stock: 5 })
    await Product.updateOne({ _id: sellerProduct._id }, { $set: { ownerType: 'SELLER', store: store._id, seller: seller._id } })

    const order = await customer.post('/api/orders').send({
      items: [{ productId: sellerProduct._id, qty: 1 }],
      customer: deliveryInfo('Seller Cust'),
    })
    assert.equal(order.status, 201)
    assert.equal(order.body.data.order.referralAttributed, false)
    assert.equal(order.body.data.order.marketer, null)
    assert.equal(order.body.data.order.commissionAmount, 0)

    const admin = await adminAgent()
    await admin.patch(`/api/admin/orders/${order.body.data.order._id}/status`).send({ status: 'confirmed' })
    await admin.patch(`/api/admin/orders/${order.body.data.order._id}/status`).send({ status: 'delivered' })

    assert.equal(await Commission.countDocuments({ marketer: marketer._id }), 0)
    assert.equal((await MarketerProfile.findOne({ user: marketer._id }).lean()).totalEarnings, 0)
  })
})