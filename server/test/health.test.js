import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest } from './helpers.mjs'

describe('health', () => {
  before(connectTest)
  after(disconnectTest)

  it('GET /api/health responds ok', async () => {
    const res = await request(app).get('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.ok(res.body.data.uptime >= 0)
  })

  it('GET /api/config returns the delivery fee', async () => {
    const res = await request(app).get('/api/config')
    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(typeof res.body.data.deliveryFee, 'number')
  })
})