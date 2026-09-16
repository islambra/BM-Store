import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import {
  connectTest,
  disconnectTest,
  createAdmin,
  createUser,
  createMarketer,
  createProduct,
  uniquePhone,
} from './helpers.mjs'
import Referral from '../models/Referral.js'
import Commission from '../models/Commission.js'
import Payout from '../models/Payout.js'
import Order from '../models/Order.js'

const phone = uniquePhone

async function adminAgent() {
  const { phone, password } = await createAdmin()
  const admin = request.agent(app)
  await admin.post('/api/auth/login').send({ phone, password })
  return admin
}

async function createLinkedCustomer(referralId) {
  const number = phone()
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Linked Customer',
    phone: number,
    password: 'Secret@1234',
    referralId,
  })
  assert.equal(reg.status, 201)
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
}

function deliveryInfo(name = 'Referred Customer') {
  return { fullName: name, phone: '+213 555 12 34 56', wilaya: '16', commune: 'X', address: 'Y' }
}

/**
 * Creates a marketer, an active referral for them, a linked customer, an order
 * and pushes the order all the way to delivered. Returns everything needed.
 */
async function primeMarketerAndDeliver(visitor = 'visitor-1') {
  const { user, profile } = await createMarketer()
  const referral = await Referral.create({
    marketer: user._id,
    profile: profile._id,
    referralCode: profile.referralCode,
    active: true,
    expiresAt: new Date(Date.now() + 86400000),
    visitor,
  })
  const customer = await createLinkedCustomer(referral._id)
  const product = await createProduct({ name: 'Prime Product', price: 1000, stock: 10 })
  const order = await customer.post('/api/orders').send({
    items: [{ productId: product._id, qty: 2 }],
    customer: deliveryInfo(),
  })
  assert.equal(order.status, 201)
  const orderId = order.body.data.order._id

  const admin = await adminAgent()
  await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' })
  const delivered = await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'delivered' })
  assert.equal(delivered.status, 200)

  return { admin, user, profile, referral, customer, order, orderId }
}

async function marketerAgent(marketerUser) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: marketerUser.phone, password: 'Secret@1234' })
  return agent
}

describe('referral + commission lifecycle', () => {
  before(connectTest)
  after(disconnectTest)

  it('an expired referral is not attributed to an order', async () => {
    const { user, profile } = await createMarketer()
    const expired = await Referral.create({
      marketer: user._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() - 1000),
      visitor: 'expired-visitor',
    })

    const customer = await createLinkedCustomer(expired._id)
    const product = await createProduct({ name: 'Expired Link', price: 500, stock: 5 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
    })
    assert.equal(order.status, 201)
    assert.equal(order.body.data.order.referralAttributed, false)
    assert.equal(order.body.data.order.commissionAmount, 0)
    assert.equal(await Commission.countDocuments({ marketer: user._id }), 0)
  })

  it('last valid referral wins on the same identity', async () => {
    const a = await createMarketer()
    const b = await createMarketer()

    await request(app).post('/api/marketing/track').send({ referralCode: a.profile.referralCode, visitorId: 'same-guest' })
    const second = await request(app).post('/api/marketing/track').send({ referralCode: b.profile.referralCode, visitorId: 'same-guest' })
    assert.equal(second.status, 201)

    const afterA = await Referral.findOne({ profile: a.profile._id, visitor: 'same-guest' }).lean()
    const afterB = await Referral.findOne({ profile: b.profile._id, visitor: 'same-guest' }).lean()
    assert.equal(afterA.active, false)
    assert.equal(afterB.active, true)

    const number = phone()
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Last Wins Customer',
      phone: number,
      password: 'Secret@1234',
      referralId: second.body.data.referralId,
    })
    assert.equal(reg.status, 201)

    const logged = request.agent(app)
    await logged.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
    const product = await createProduct({ name: 'Last Wins', price: 1000, stock: 5 })
    const order = await logged.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo('Last Wins Customer'),
    })
    assert.equal(order.body.data.order.referralAttributed, true)
    assert.equal(String(order.body.data.order.marketer), String(b.user._id))
  })

  it('suspended marketer keeps orders that were created while the referral was valid', async () => {
    const prime = await primeMarketerAndDeliver('suspend-visitor')
    const { user, profile } = prime

    await prime.admin.patch(`/api/admin/marketers/${profile._id}/status`).send({ status: 'suspended' })

    const rejectedVisit = await request(app).post('/api/marketing/track').send({
      referralCode: profile.referralCode,
      visitorId: 'new-guest',
    })
    assert.equal(rejectedVisit.status, 404)

    const detail = await prime.admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.stats.availableBalance, 200)
    assert.equal(detail.body.data.stats.orders, 1)
  })

  it('attribution is permanent even if the referral expires after order creation', async () => {
    const { user, referral } = await createMarketer().then(async ({ user, profile }) => {
      const referral = await Referral.create({
        marketer: user._id,
        profile: profile._id,
        referralCode: profile.referralCode,
        active: true,
        expiresAt: new Date(Date.now() + 3600000),
        visitor: 'permanent-visitor',
      })
      return { user, referral }
    })

    const customer = await createLinkedCustomer(referral._id)
    const product = await createProduct({ name: 'Permanent', price: 1000, stock: 5 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
    })
    assert.equal(order.body.data.order.referralAttributed, true)

    await Referral.updateOne({ _id: referral._id }, { $set: { active: false, expiresAt: new Date(Date.now() - 1000) } })

    const stored = await Order.findById(order.body.data.order._id).lean()
    assert.equal(String(stored.marketer), String(user._id))
    assert.equal(stored.referralCode, referral.referralCode)
    assert.ok(stored.referredAt)
  })

  it('creates the commission only once the order is delivered', async () => {
    const { user, admin, orderId } = await primeMarketerAndDeliver('pending-visitor')
    const commission = await Commission.findOne({ order: orderId }).lean()
    assert.ok(commission)
    assert.equal(commission.status, 'AVAILABLE')
    assert.equal(commission.amount, 200)

    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.body.data.stats.availableBalance, 200)
    assert.equal(detail.body.data.stats.totalEarnings, 200)
  })

  it('never creates a commission when the order is cancelled before delivery', async () => {
    const { user, orderId } = await createMarketer().then(async ({ user, profile }) => {
      const referral = await Referral.create({
        marketer: user._id,
        profile: profile._id,
        referralCode: profile.referralCode,
        active: true,
        expiresAt: new Date(Date.now() + 86400000),
        visitor: 'cancel-visitor',
      })
      const customer = await createLinkedCustomer(referral._id)
      const product = await createProduct({ name: 'Cancel Me', price: 1000, stock: 5 })
      const order = await customer.post('/api/orders').send({
        items: [{ productId: product._id, qty: 1 }],
        customer: deliveryInfo(),
      })
      return { user, orderId: order.body.data.order._id }
    })

    const admin = await adminAgent()
    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'confirmed' })
    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'cancelled' })

    assert.equal(await Commission.countDocuments({ order: orderId }), 0)
    assert.equal(await Commission.countDocuments({ marketer: user._id }), 0)
  })

  it('does not double-credit a commission on repeated delivery attempts', async () => {
    const { admin, orderId } = await primeMarketerAndDeliver('double-visitor')
    const again = await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'delivered' })
    assert.equal(again.status, 400)
    assert.equal(await Commission.countDocuments({ order: orderId }), 1)
  })

  it('does not pay a commission on future orders after referral expiry', async () => {
    const { referral } = await createMarketer().then(async ({ user, profile }) => {
      const referral = await Referral.create({
        marketer: user._id,
        profile: profile._id,
        referralCode: profile.referralCode,
        active: true,
        expiresAt: new Date(Date.now() + 3600000),
        visitor: 'soon-expire',
      })
      return { referral }
    })

    const customer = await createLinkedCustomer(referral._id)
    const product = await createProduct({ name: 'Expiry Product', price: 1000, stock: 10 })

    await Referral.updateOne({ _id: referral._id }, { $set: { active: false, expiresAt: new Date(Date.now() - 1) } })

    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
    })
    assert.equal(order.body.data.order.referralAttributed, false)
    assert.equal(await Commission.countDocuments({ marketer: referral.marketer }), 0)
  })

  it('blocks new order attribution once the marketer is suspended', async () => {
    const { user, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: user._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'suspend-order-visitor',
    })
    const customer = await createLinkedCustomer(referral._id)
    const admin = await adminAgent()
    await admin.patch(`/api/admin/marketers/${profile._id}/status`).send({ status: 'suspended' })

    const product = await createProduct({ name: 'Suspended Now', price: 1000, stock: 10 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
    })
    assert.equal(order.status, 201)
    assert.equal(order.body.data.order.referralAttributed, false)
    assert.equal(order.body.data.order.commissionAmount, 0)
    assert.equal(await Commission.countDocuments({ marketer: user._id }), 0)
  })

  it('ignores a referral id that does not belong to the ordering visitor', async () => {
    const other = await createMarketer()
    const otherRef = await Referral.create({
      marketer: other.user._id,
      profile: other.profile._id,
      referralCode: other.profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'other-visitor',
    })

    const number = phone()
    await request(app).post('/api/auth/register').send({ name: 'Mine', phone: number, password: 'Secret@1234' })
    const mine = request.agent(app)
    await mine.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Ownership', price: 1000, stock: 10 })
    const stolen = await mine.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
      referralId: String(otherRef._id),
      visitorId: 'my-visitor',
    })
    assert.equal(stolen.status, 201)
    assert.equal(stolen.body.data.order.referralAttributed, false)
    assert.equal(stolen.body.data.order.commissionAmount, 0)
  })

  it('attributes an order when the referral belongs to the ordering visitor', async () => {
    const { user, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: user._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'owner-passes-visitor',
    })

    const number = phone()
    await request(app).post('/api/auth/register').send({ name: 'Owner Card', phone: number, password: 'Secret@1234' })
    const mine = request.agent(app)
    await mine.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })

    const product = await createProduct({ name: 'Owner Product', price: 1000, stock: 10 })
    const order = await mine.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
      referralId: String(referral._id),
      visitorId: 'owner-passes-visitor',
    })
    assert.equal(order.status, 201)
    assert.equal(order.body.data.order.referralAttributed, true)
    assert.equal(String(order.body.data.order.marketer), String(user._id))
  })

  it('reports no total earnings while an attributed order is still pending', async () => {
    const { user, profile } = await createMarketer()
    const referral = await Referral.create({
      marketer: user._id,
      profile: profile._id,
      referralCode: profile.referralCode,
      active: true,
      expiresAt: new Date(Date.now() + 86400000),
      visitor: 'pending-earnings-visitor',
    })
    const customer = await createLinkedCustomer(referral._id)
    const product = await createProduct({ name: 'Pending Earnings', price: 1000, stock: 10 })
    const order = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: deliveryInfo(),
    })
    assert.equal(order.status, 201)

    const admin = await adminAgent()
    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.stats.totalEarnings, 0)
    assert.equal(detail.body.data.stats.availableBalance, 0)
    assert.equal(detail.body.data.stats.pendingEarnings, 0)
  })
})

describe('payout workflow', () => {
  before(connectTest)
  after(disconnectTest)

  it("admin sends a payout and the marketer confirms receipt", async () => {
    const { admin, user, orderId } = await primeMarketerAndDeliver('confirm-visitor')

    const payout = await admin.post('/api/admin/payouts').send({
      marketerId: user._id,
      amount: 200,
      method: 'CCP',
      reference: 'PAY-1',
    })
    assert.equal(payout.status, 201)
    assert.equal(payout.body.data.status, 'sent')
    const payoutId = payout.body.data._id

    const commission = await Commission.findOne({ order: orderId }).lean()
    assert.equal(commission.status, 'PAYMENT_SENT')

    const tooBig = await admin.post('/api/admin/payouts').send({ marketerId: user._id, amount: 201, method: 'CCP' })
    assert.equal(tooBig.status, 400)

    const agent = await marketerAgent(user)
    const confirmed = await agent.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.body.data.payout.status, 'received')

    const afterRef = await Commission.findOne({ order: orderId }).lean()
    assert.equal(afterRef.status, 'RECEIVED')

    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.body.data.stats.availableBalance, 0)
    assert.equal(detail.body.data.stats.totalPaid, 200)
  })

  it('marketer can dispute a payout and admin can cancel it', async () => {
    const { admin, user } = await primeMarketerAndDeliver('dispute-visitor')

    const payout = await admin.post('/api/admin/payouts').send({
      marketerId: user._id,
      amount: 200,
      method: 'BaridiMob',
    })
    assert.equal(payout.status, 201)
    const payoutId = payout.body.data._id

    const agent = await marketerAgent(user)
    const disputed = await agent.post(`/api/marketer/payments/${payoutId}/report-not-received`)
    assert.equal(disputed.status, 200)
    assert.equal(disputed.body.data.payout.status, 'disputed')

    const cancelled = await admin.patch(`/api/admin/payouts/${payoutId}`).send({ action: 'cancel' })
    assert.equal(cancelled.status, 200)
    assert.equal(cancelled.body.data.status, 'cancelled')

    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.body.data.stats.availableBalance, 200)
  })

  it('a marketer cannot confirm another marketer payout', async () => {
    const { admin, user } = await primeMarketerAndDeliver('owner-visitor')

    const payout = await admin.post('/api/admin/payouts').send({
      marketerId: user._id,
      amount: 200,
      method: 'CCP',
    })
    const payoutId = payout.body.data._id

    const intruder = await createUser({ role: 'MARKETER' })
    const intruderAgent = await marketerAgent(intruder)
    const res = await intruderAgent.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(res.status, 403)
  })

  it('admin gathers marketer detail, commissions and referrals', async () => {
    const { admin, user, referral } = await primeMarketerAndDeliver('admin-detail-visitor')

    const detail = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.commissionsCount, 1)
    assert.equal(detail.body.data.stats.orders, 1)

    const commissions = await admin.get(`/api/admin/marketers/${user._id}/commissions`)
    assert.equal(commissions.status, 200)
    assert.equal(commissions.body.data.commissions.length, 1)

    const referrals = await admin.get(`/api/admin/marketers/${user._id}/referrals`)
    assert.equal(referrals.status, 200)
    assert.equal(referrals.body.data.referrals.length, 1)
    assert.equal(String(referrals.body.data.referrals[0]._id), String(referral._id))

    const orders = await admin.get(`/api/admin/marketers/${user._id}/orders`)
    assert.equal(orders.status, 200)
    assert.equal(orders.body.data.orders[0].commission.status, 'AVAILABLE')
  })

  it('refuses a payout amount that cannot exactly match available commissions', async () => {
    const { admin, user } = await createMarketer().then(async ({ user, profile }) => {
      const referral = await Referral.create({
        marketer: user._id,
        profile: profile._id,
        referralCode: profile.referralCode,
        active: true,
        expiresAt: new Date(Date.now() + 86400000),
        visitor: 'exact-fit-visitor',
      })
      const customer = await createLinkedCustomer(referral._id)
      const admin = await adminAgent()
      const placeAndDeliver = async () => {
        const product = await createProduct({ name: `ExactFit-${Math.random()}`, price: 3000, stock: 10 })
        const order = await customer.post('/api/orders').send({
          items: [{ productId: product._id, qty: 1 }],
          customer: deliveryInfo(),
        })
        for (const s of ['confirmed', 'delivered']) {
          await admin.patch(`/api/admin/orders/${order.body.data.order._id}/status`).send({ status: s })
        }
      }
      await placeAndDeliver()
      await placeAndDeliver()
      return { admin, user }
    })

    const stats = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(stats.body.data.stats.availableBalance, 600)

    const partial = await admin.post('/api/admin/payouts').send({ marketerId: user._id, amount: 500, method: 'CCP' })
    assert.equal(partial.status, 400)

    const after = await admin.get(`/api/admin/marketers/${user._id}`)
    assert.equal(after.body.data.stats.availableBalance, 600)
    assert.equal(await Commission.countDocuments({ marketer: user._id, status: 'PAYMENT_SENT' }), 0)

    const full = await admin.post('/api/admin/payouts').send({ marketerId: user._id, amount: 600, method: 'CCP' })
    assert.equal(full.status, 201)
    assert.equal(full.body.data.amount, 600)
    assert.equal(await Commission.countDocuments({ marketer: user._id, status: 'PAYMENT_SENT' }), 2)
  })

  it('admin cannot confirm a payout; a payout can only be confirmed once', async () => {
    const { admin, user } = await primeMarketerAndDeliver('double-confirm-visitor')

    const payout = await admin.post('/api/admin/payouts').send({ marketerId: user._id, amount: 200, method: 'CCP' })
    assert.equal(payout.status, 201)
    const payoutId = payout.body.data._id

    const asAdmin = await admin.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(asAdmin.status, 403)

    const agent = await marketerAgent(user)
    const first = await agent.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(first.status, 200)
    assert.equal(first.body.data.payout.status, 'received')

    const second = await agent.post(`/api/marketer/payments/${payoutId}/confirm-received`)
    assert.equal(second.status, 400)
    assert.equal(await Commission.countDocuments({ marketer: user._id, status: 'RECEIVED' }), 1)
  })
})