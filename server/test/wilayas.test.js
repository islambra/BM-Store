import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createAdmin, createProduct, uniquePhone } from './helpers.mjs'
import { seedWilayas, WILAYAS } from '../config/wilayas.js'

async function adminAgent() {
  const { phone, password } = await createAdmin()
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone, password })
  return agent
}

async function customerAgent() {
  const number = uniquePhone()
  await request(app).post('/api/auth/register').send({ name: 'Customer', phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  return agent
}

describe('wilaya delivery pricing', () => {
  before(connectTest)
  after(disconnectTest)

  beforeEach(async () => {
    await clearCollection('wilayas')
    await seedWilayas()
  })

  it('seeds every wilaya with the default 350 price', async () => {
    const res = await request(app).get('/api/wilayas')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, WILAYAS.length)
    for (const w of res.body.data) {
      assert.ok(w._id)
      assert.ok(w.code)
      assert.ok(w.name)
      assert.equal(w.deliveryPrice, 350)
    }
  })

  it('does not reseed or overwrite an existing price on startup', async () => {
    const agent = await adminAgent()
    await agent.patch('/api/admin/wilayas/01').send({ deliveryPrice: 900 })
    await seedWilayas() // simulates a server restart
    const res = await request(app).get('/api/wilayas')
    assert.equal(res.body.data.find((w) => w.code === '01').deliveryPrice, 900)
  })

  it('requires admin auth to list and update wilayas', async () => {
    const list = await request(app).get('/api/admin/wilayas')
    assert.equal(list.status, 401)
    const patch = await request(app).patch('/api/admin/wilayas/01').send({ deliveryPrice: 500 })
    assert.equal(patch.status, 401)
  })

  it('lets the admin update a price and reflects it publicly and at checkout', async () => {
    const agent = await adminAgent()

    const before = await agent.get('/api/admin/wilayas')
    assert.equal(before.status, 200)
    assert.equal(before.body.data.wilayas.length, WILAYAS.length)
    assert.equal(before.body.data.defaultPrice, 350)

    const updated = await agent.patch('/api/admin/wilayas/01').send({ deliveryPrice: 700 })
    assert.equal(updated.status, 200, JSON.stringify(updated.body))
    assert.equal(updated.body.data.deliveryPrice, 700)

    const publicList = await request(app).get('/api/wilayas')
    const adrar = publicList.body.data.find((w) => w.code === '01')
    assert.equal(adrar.deliveryPrice, 700)

    // Checkout sends only wilayaId — the price is taken from MongoDB and
    // snapshotted onto the order. Client-supplied prices are ignored.
    const customer = await customerAgent()
    const product = await createProduct({ name: 'Adrar Product', price: 1000 })
    const res = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: {
        fullName: 'Adrar Buyer',
        phone: '+213 555 00 00 00',
        wilayaId: adrar._id,
        deliveryPrice: 1, // ignored — never trusted from the client
        commune: 'Adrar',
        address: 'Rue 1',
      },
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    const order = res.body.data.order
    assert.equal(order.subtotal, 1000)
    assert.equal(order.delivery, 700)
    assert.equal(order.total, 1700)
    // Snapshot on the order
    assert.equal(String(order.customer.wilayaId), String(adrar._id))
    assert.equal(order.customer.wilayaCode, '01')
    assert.equal(order.customer.wilaya, '01')
    assert.equal(order.customer.wilayaName, 'Adrar')
    assert.equal(order.customer.deliveryPrice, 700)
  })

  it('rejects an unknown or inactive wilayaId', async () => {
    const customer = await customerAgent()
    const product = await createProduct({ name: 'Bad Wilaya Product', price: 500 })
    const customerBody = {
      fullName: 'No Wilaya Buyer',
      phone: '+213 555 01 01 01',
      commune: 'Nowhere',
      address: 'Rue 0',
    }

    const missing = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: { ...customerBody, wilayaId: '000000000000000000000000' },
    })
    assert.equal(missing.status, 400)

    const without = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: customerBody,
    })
    assert.equal(without.status, 400)
  })

  it('re-prices and re-snapshots when the customer edits the wilaya on a pending order', async () => {
    const admin = await adminAgent()
    await admin.patch('/api/admin/wilayas/01').send({ deliveryPrice: 700 })

    const customer = await customerAgent()
    const product = await createProduct({ name: 'Editable Wilaya Product', price: 800 })
    const created = await customer.post('/api/orders').send({
      items: [{ productId: product._id, qty: 1 }],
      customer: {
        fullName: 'Editable Buyer',
        phone: '+213 555 02 02 02',
        wilayaId: (await request(app).get('/api/wilayas')).body.data.find((w) => w.code === '16')._id,
        commune: 'Alger Centre',
        address: 'Rue 2',
      },
    })
    assert.equal(created.status, 201, JSON.stringify(created.body))
    assert.equal(created.body.data.order.delivery, 350)
    const orderId = created.body.data.order._id

    const algerToAdrar = await customer.patch(`/api/orders/${orderId}`).send({
      customer: { wilayaId: (await request(app).get('/api/wilayas')).body.data.find((w) => w.code === '01')._id },
    })
    assert.equal(algerToAdrar.status, 200, JSON.stringify(algerToAdrar.body))
    const order = algerToAdrar.body.data.order
    assert.equal(order.customer.wilayaCode, '01')
    assert.equal(order.customer.wilayaName, 'Adrar')
    assert.equal(order.customer.deliveryPrice, 700)
    assert.equal(order.delivery, 700)
    assert.equal(order.total, 800 + 700)
  })

  it('rejects an invalid price and excludes inactive wilayas from the public list', async () => {
    const agent = await adminAgent()

    const invalid = await agent.patch('/api/admin/wilayas/02').send({ deliveryPrice: -5 })
    assert.equal(invalid.status, 400)

    const missing = await agent.patch('/api/admin/wilayas/ZZ').send({ deliveryPrice: 100 })
    assert.equal(missing.status, 404)

    const deactivate = await agent.patch('/api/admin/wilayas/02').send({ isActive: false })
    assert.equal(deactivate.status, 200)
    assert.equal(deactivate.body.data.isActive, false)

    const publicList = await request(app).get('/api/wilayas')
    assert.equal(publicList.body.data.find((w) => w.code === '02'), undefined)
  })
})