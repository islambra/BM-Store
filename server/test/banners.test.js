import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createAdmin } from './helpers.mjs'

describe('hero banners (max 5 active)', () => {
  before(connectTest)
  beforeEach(async () => {
    await clearCollection('herobanners')
  })
  after(disconnectTest)

  async function adminAgent() {
    const { phone, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    return agent
  }

  const ban = (override = {}) => ({ image: '/img.jpg', titleEn: 'Banner', active: true, ...override })

  it('accepts up to 5 active banners', async () => {
    const agent = await adminAgent()
    for (let i = 1; i <= 5; i++) {
      const res = await agent.post('/api/admin/banners').send(ban({ titleEn: `Banner ${i}` }))
      assert.equal(res.status, 201, `banner #${i} should be created`)
    }
    const list = await agent.get('/api/admin/banners')
    assert.equal(list.body.data.activeCount, 5)
  })

  it('rejects a 6th active banner', async () => {
    const agent = await adminAgent()
    for (let i = 1; i <= 5; i++) {
      await agent.post('/api/admin/banners').send(ban({ titleEn: `Banner ${i}` }))
    }
    const sixth = await agent.post('/api/admin/banners').send(ban({ titleEn: 'Banner 6' }))
    assert.equal(sixth.status, 400)
    assert.match(sixth.body.message, /Maximum 5 active banners/)
  })

  it('allows a 6th active banner after deactivating one', async () => {
    const agent = await adminAgent()
    const created = []
    for (let i = 1; i <= 5; i++) {
      const res = await agent.post('/api/admin/banners').send(ban({ titleEn: `Banner ${i}` }))
      created.push(res.body.data)
    }
    await agent.patch(`/api/admin/banners/${created[0]._id}`).send({ active: false })

    const sixth = await agent.post('/api/admin/banners').send(ban({ titleEn: 'Banner 6' }))
    assert.equal(sixth.status, 201)

    const list = await agent.get('/api/admin/banners')
    assert.equal(list.body.data.activeCount, 5)
  })

  it('public list returns only active banners with image-only payloads', async () => {
    const agent = await adminAgent()
    await agent.post('/api/admin/banners').send(ban({ titleEn: 'Visible', image: '/visible.jpg' }))
    await agent.post('/api/admin/banners').send(ban({ titleEn: 'Hidden', active: false, image: '/hidden.jpg' }))

    const res = await request(app).get('/api/banners')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 1)
    assert.equal(res.body.data[0].image, '/visible.jpg')
    assert.ok(res.body.data[0].titleEn === undefined)
  })

  it('anonymous users cannot manage banners', async () => {
    const res = await request(app).post('/api/admin/banners').send(ban())
    assert.equal(res.status, 401)
  })
})