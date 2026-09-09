import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, uniquePhone } from './helpers.mjs'

const phone = uniquePhone
const email = () => `auth-${Date.now()}-${Math.floor(Math.random() * 99999)}@bmstore.test`

describe('authentication', () => {
  before(connectTest)
  after(disconnectTest)

  it('registers a USER with a unique phone number and sets auth cookies', async () => {
    const agent = request.agent(app)
    const res = await agent.post('/api/auth/register').send({
      name: 'Auth Tester',
      phone: phone(),
      password: 'Secret@1234',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.user.role, 'USER')
    const setCookies = res.headers['set-cookie'] || []
    assert.ok(setCookies.some((c) => c.startsWith('bm_access=')))
    assert.ok(setCookies.some((c) => c.startsWith('bm_refresh=')))
  })

  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak',
      phone: phone(),
      password: '123',
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.success, false)
  })

  it('rejects duplicate phone registration', async () => {
    const number = phone()
    await request(app).post('/api/auth/register').send({ name: 'A', phone: number, password: 'Secret@1234' })
    const res = await request(app).post('/api/auth/register').send({ name: 'B', phone: number, password: 'Secret@1234' })
    assert.equal(res.status, 409)
  })

  it('logs in with phone and refreshes', async () => {
    const number = phone()
    await request(app).post('/api/auth/register').send({ name: 'Login', phone: number, password: 'Secret@1234' })

    const agent = request.agent(app)
    const bad = await agent.post('/api/auth/login').send({ phone: number, password: 'wrong-password' })
    assert.equal(bad.status, 401)

    const res = await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
    assert.equal(res.status, 200)
    assert.ok((res.headers['set-cookie'] || []).some((c) => c.startsWith('bm_access=')))

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.user.phone, number)

    const refreshed = await agent.post('/api/auth/refresh')
    assert.equal(refreshed.status, 200)
    assert.equal(refreshed.body.data.user.phone, number)
  })

  it('registers a marketer directly with payout details', async () => {
    const res = await request(app).post('/api/auth/register-marketer').send({
      name: 'Direct Marketer',
      phone: phone(),
      password: 'Secret@1234',
      baridiMob: '0651123456',
      ccp: '00123456789',
      ccpKey: '987654',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.user.role, 'MARKETER')
    assert.ok(res.body.data.marketer.referralCode)
  })

  it('rejects /me without a session', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
  })

  it('logs out and clears sessions', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/register').send({ name: 'Out', phone: phone(), password: 'Secret@1234' })
    const res = await agent.post('/api/auth/logout')
    assert.equal(res.status, 200)
    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 401)
  })
})