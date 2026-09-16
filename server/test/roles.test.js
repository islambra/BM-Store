import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, createUser, uniquePhone } from './helpers.mjs'

describe('role protection', () => {
  before(connectTest)
  after(disconnectTest)

  it('blocks USER from admin routes', async () => {
    const { phone, password } = await createUser()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent.get('/api/admin/users')
    assert.equal(res.status, 403)
  })

  it('blocks USER from marketer routes', async () => {
    const { phone, password } = await createUser()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent.get('/api/marketer/me')
    assert.equal(res.status, 403)
  })

  it('block MARKETER from admin routes', async () => {
    const { phone, password } = await createUser({ name: 'Marketer-Agent', role: 'MARKETER' })
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent.get('/api/admin/users')
    assert.equal(res.status, 403)
  })

  it('blocks USER from admin product creation', async () => {
    const { phone, password } = await createUser()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent.post('/api/admin/products').send({ name: 'X', price: 10, category: 'spices' })
    assert.equal(res.status, 403)
  })

  it('allows MARKETER into marketer routes after become-marketer', async () => {
    const { phone, password } = await createUser({ name: 'Future Marketer' })
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })

    const upgrade = await agent.post('/api/auth/become-marketer')
    assert.equal(upgrade.status, 201)
    assert.equal(upgrade.body.data.user.role, 'MARKETER')
    assert.ok(upgrade.body.data.marketer.referralCode)

    const me = await agent.get('/api/marketer/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.profile.referralCode, upgrade.body.data.marketer.referralCode)
  })

  it('allows ADMIN into admin routes', async () => {
    const { phone, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent.get('/api/admin/users')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data.users))
    assert.equal(res.body.data.users[0].passwordHash, undefined)
  })

  it('blocks USER from uploading images', async () => {
    const { phone, password } = await createUser()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    const res = await agent
      .post('/api/admin/upload')
      .attach('image', Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), 'pixel.png')
    assert.equal(res.status, 403)
  })

  it('allows SELLER to upload images for payment proofs and store logos', async () => {
    const phone = uniquePhone()
    const registration = await request(app).post('/api/seller/register').send({
      fullName: 'Uploading Seller',
      email: `upload-${phone}@test.dev`,
      phone,
      password: 'Secret@1234',
      confirmPassword: 'Secret@1234',
    })
    assert.equal(registration.status, 201)

    const agent = request.agent(app)
    const login = await agent.post('/api/seller/login').send({ phone, password: 'Secret@1234' })
    assert.equal(login.status, 200)

    const res = await agent
      .post('/api/admin/upload')
      .attach('image', Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), 'proof.png')
    assert.equal(res.status, 201)
    assert.match(res.body.data.url, /^\/uploads\/[0-9a-f]{24}$/)
  })
})
