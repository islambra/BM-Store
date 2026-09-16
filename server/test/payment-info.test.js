import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, createUser, uniquePhone } from './helpers.mjs'
import Seller from '../models/Seller.js'
import Store from '../models/Store.js'

describe('admin payment info (CCP / BaridiMob)', () => {
  before(connectTest)
  after(disconnectTest)

  it('admin saves and reads back ccp, ccpKey and baridiMob on their profile', async () => {
    const { phone, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })

    const saved = await agent
      .patch('/api/auth/me')
      .send({ ccp: '0123456789', ccpKey: '1234', baridiMob: '0550123456' })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.data.user.ccp, '0123456789')
    assert.equal(saved.body.data.user.ccpKey, '1234')
    assert.equal(saved.body.data.user.baridiMob, '0550123456')

    const me = await agent.get('/api/auth/me')
    assert.equal(me.body.data.user.ccp, '0123456789')
    assert.equal(me.body.data.user.baridiMob, '0550123456')
  })

  it('non-admin users cannot set the shared payment details', async () => {
    const { phone, password } = await createUser({ name: 'Plain User' })
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })

    const res = await agent.patch('/api/auth/me').send({ ccp: 'fake-ccp' })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.user.ccp, undefined)
  })

  it('seller store-request endpoint exposes the admin payment info', async () => {
    const { phone, password } = await createAdmin()
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ phone, password })
    await adminAgent.patch('/api/auth/me').send({ ccp: '0123456789', ccpKey: '4321', baridiMob: '0550123456' })

    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Payment Seller',
      email: `payment-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const res = await agent.get('/api/seller/store-request')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.storeRequest, null)
    assert.equal(res.body.data.paymentInfo.ccp, '0123456789')
    assert.equal(res.body.data.paymentInfo.ccpKey, '4321')
    assert.equal(res.body.data.paymentInfo.baridiMob, '0550123456')
  })

  it('seller subscription endpoint exposes the admin payment info', async () => {
    const { phone, password } = await createAdmin()
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ phone, password })
    await adminAgent.patch('/api/auth/me').send({ ccp: '1111222233', ccpKey: '99', baridiMob: '0770998877' })

    const number = uniquePhone()
    await request(app).post('/api/seller/register').send({
      fullName: 'Sub Seller',
      email: `sub-${number}@test.dev`,
      phone: number,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const seller = await Seller.findOne({ phone: number.replace(/[\s-]+/g, '') }).lean()
    assert.ok(seller)
    await Store.create({
      seller: seller._id,
      name: 'Sub Store',
      slug: `sub-store-${Date.now()}`,
      status: 'active',
      subscriptionEndDate: new Date(Date.now() + 86400000 * 30),
    })

    const res = await agent.get('/api/store/subscription')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.paymentInfo.ccp, '1111222233')
    assert.equal(res.body.data.paymentInfo.ccpKey, '99')
    assert.equal(res.body.data.paymentInfo.baridiMob, '0770998877')
  })
})