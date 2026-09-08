import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest } from './helpers.mjs'

const email = () => `auth-${Date.now()}-${Math.floor(Math.random() * 99999)}@bmstore.test`

describe('authentication', () => {
  before(connectTest)
  after(disconnectTest)

  it('registers a USER and sets auth cookies', async () => {
    const agent = request.agent(app)
    const res = await agent.post('/api/auth/register').send({
      name: 'Auth Tester',
      email: email(),
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
      email: email(),
      password: '123',
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.success, false)
  })

  it('rejects duplicate registration', async () => {
    const address = email()
    await request(app).post('/api/auth/register').send({ name: 'A', email: address, password: 'Secret@1234' })
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email: address, password: 'Secret@1234' })
    assert.equal(res.status, 409)
  })

  it('logs in and refreshes', async () => {
    const address = email()
    await request(app).post('/api/auth/register').send({ name: 'Login', email: address, password: 'Secret@1234' })

    const agent = request.agent(app)
    const bad = await agent.post('/api/auth/login').send({ email: address, password: 'wrong-password' })
    assert.equal(bad.status, 401)

    const res = await agent.post('/api/auth/login').send({ email: address, password: 'Secret@1234' })
    assert.equal(res.status, 200)
    assert.ok((res.headers['set-cookie'] || []).some((c) => c.startsWith('bm_access=')))

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.user.email, address)

    const refreshed = await agent.post('/api/auth/refresh')
    assert.equal(refreshed.status, 200)
    assert.equal(refreshed.body.data.user.email, address)
  })

  it('rejects /me without a session', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
  })

  it('logs out and clears sessions', async () => {
    const address = email()
    const agent = request.agent(app)
    await agent.post('/api/auth/register').send({ name: 'Out', email: address, password: 'Secret@1234' })
    const res = await agent.post('/api/auth/logout')
    assert.equal(res.status, 200)
    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 401)
  })
})