import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createAdmin } from './helpers.mjs'

// Admin dashboard creates Arabic content and relies on the server to fill the
// English fields. These tests pin that wiring for categories, products and
// posts by stubbing the free translation provider.
const TRANSLATIONS = {
  'بهارات طازجة': 'Fresh Spices',
  'زعفران فاخر': 'Luxury Saffron',
  'زعفران أصلي عالي الجودة': 'Original high quality saffron',
  'عرض الليلة': 'Tonight offer',
}

describe('admin create auto-translates Arabic content', () => {
  before(async () => {
    process.env.TRANSLATION_FALLBACK = 'on'
    global.fetch = async (url) => {
      const q = new URL(url).searchParams.get('q')
      const translatedText = TRANSLATIONS[q]
      if (!translatedText) return { ok: false, status: 404 }
      return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText } }) }
    }
    await connectTest()
  })

  after(disconnectTest)

  beforeEach(async () => {
    await clearCollection('categories')
    await clearCollection('products')
    await clearCollection('posts')
  })

  async function adminAgent() {
    const { phone, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ phone, password })
    return agent
  }

  it('translates a category name on create', async () => {
    const agent = await adminAgent()
    const res = await agent.post('/api/admin/categories').send({ nameAr: 'بهارات طازجة', active: true })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.name, 'Fresh Spices')
    assert.equal(res.body.data.nameAr, 'بهارات طازجة')
  })

  it('translates a product name and description on create', async () => {
    const agent = await adminAgent()
    const cat = await agent.post('/api/admin/categories').send({ nameAr: 'بهارات طازجة', active: true })
    const res = await agent.post('/api/admin/products').send({
      nameAr: 'زعفران فاخر',
      descriptionAr: 'زعفران أصلي عالي الجودة',
      price: 1000,
      category: cat.body.data.slug,
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.name, 'Luxury Saffron')
    assert.equal(res.body.data.description, 'Original high quality saffron')
    assert.equal(res.body.data.nameAr, 'زعفران فاخر')
  })

  it('translates a post text on create', async () => {
    const agent = await adminAgent()
    const res = await agent
      .post('/api/admin/posts')
      .send({ textAr: 'عرض الليلة', status: 'published', mediaType: 'images', images: [] })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.textEn, 'Tonight offer')
    assert.equal(res.body.data.textAr, 'عرض الليلة')
  })
})
