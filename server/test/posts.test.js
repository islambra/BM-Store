import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createAdmin, createProduct } from './helpers.mjs'

describe('posts (media section)', () => {
  before(connectTest)
  beforeEach(async () => {
    await clearCollection('posts')
  })
  after(disconnectTest)

  async function adminAgent() {
    const { email, password } = await createAdmin()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email, password })
    return agent
  }

  it('lets admin create a post with images and a linked product', async () => {
    const agent = await adminAgent()
    const product = await createProduct()

    const res = await agent.post('/api/admin/posts').send({
      textEn: 'Discover our new product',
      textAr: 'اكتشف منتجنا الجديد',
      mediaType: 'images',
      images: ['/uploads/a.jpg', '/uploads/b.jpg'],
      productId: String(product._id),
      status: 'draft',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.mediaType, 'images')
    assert.equal(res.body.data.images.length, 2)
    assert.equal(res.body.data.productId._id, String(product._id))
    assert.equal(res.body.data.status, 'draft')
  })

  it('caps images at 5', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const res = await agent.post('/api/admin/posts').send({
      mediaType: 'images',
      images: Array.from({ length: 8 }, (_, i) => `/uploads/${i}.jpg`),
      productId: String(product._id),
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.images.length, 5)
  })

  it('supports a single video post and clears images', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const res = await agent.post('/api/admin/posts').send({
      mediaType: 'video',
      images: ['/uploads/a.jpg'],
      video: '/uploads/video.mp4',
      productId: String(product._id),
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.mediaType, 'video')
    assert.equal(res.body.data.video, '/uploads/video.mp4')
    assert.deepEqual(res.body.data.images, [])
  })

  it('requires a video URL for video posts', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const res = await agent.post('/api/admin/posts').send({
      mediaType: 'video',
      productId: String(product._id),
    })
    assert.equal(res.status, 400)
    assert.match(res.body.message, /Video URL is required/)
  })

  it('requires a valid linked product', async () => {
    const agent = await adminAgent()
    const bad = await agent.post('/api/admin/posts').send({
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: '000000000000000000000000',
    })
    assert.equal(bad.status, 404)
    assert.match(bad.body.message, /Product not found/)

    const missing = await agent.post('/api/admin/posts').send({ mediaType: 'images', images: ['/a.jpg'] })
    assert.equal(missing.status, 400)
    assert.match(missing.body.message, /Product is required/)
  })

  it('edit updates text, media and product', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const other = await createProduct({ name: 'Second Product' })

    const created = await agent.post('/api/admin/posts').send({
      textEn: 'Old text',
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
    })

    const updated = await agent.patch(`/api/admin/posts/${created.body.data._id}`).send({
      textEn: 'New text',
      mediaType: 'video',
      video: '/uploads/new.mp4',
      productId: String(other._id),
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.textEn, 'New text')
    assert.equal(updated.body.data.video, '/uploads/new.mp4')
    assert.equal(updated.body.data.productId._id, String(other._id))
  })

  it('publishes and unpublishes a post', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const created = await agent.post('/api/admin/posts').send({
      textEn: 'Draft post',
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
      status: 'draft',
    })
    const id = created.body.data._id

    const published = await agent.patch(`/api/admin/posts/${id}/publish`)
    assert.equal(published.body.data.status, 'published')

    const unpublished = await agent.patch(`/api/admin/posts/${id}/publish`)
    assert.equal(unpublished.body.data.status, 'draft')
  })

  it('public list only exposes published posts', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    await agent.post('/api/admin/posts').send({
      textEn: 'Draft post',
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
      status: 'draft',
    })
    const published = await agent.post('/api/admin/posts').send({
      textEn: 'Live post',
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
      status: 'published',
    })

    const res = await request(app).get('/api/posts')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.posts.length, 1)
    assert.equal(res.body.data.posts[0]._id, published.body.data._id)
    assert.equal(res.body.data.posts[0].productId._id, String(product._id))

    const single = await request(app).get(`/api/posts/${published.body.data._id}`)
    assert.equal(single.status, 200)
  })

  it('home endpoint returns latest published posts', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    for (let i = 0; i < 3; i++) {
      await agent.post('/api/admin/posts').send({
        textEn: `Post ${i}`,
        mediaType: 'images',
        images: ['/uploads/a.jpg'],
        productId: String(product._id),
        status: 'published',
      })
    }
    const res = await request(app).get('/api/posts/home')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 3)
  })

  it('admin can delete a post', async () => {
    const agent = await adminAgent()
    const product = await createProduct()
    const created = await agent.post('/api/admin/posts').send({
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
    })
    const del = await agent.delete(`/api/admin/posts/${created.body.data._id}`)
    assert.equal(del.status, 200)

    const list = await agent.get('/api/admin/posts')
    assert.equal(list.body.data.posts.length, 0)
  })

  it('public users cannot manage posts', async () => {
    const res = await request(app).post('/api/admin/posts').send({ mediaType: 'images' })
    assert.equal(res.status, 401)
  })

  it('USER role cannot create posts', async () => {
    const res = await request(app).post('/api/admin/posts').send({ mediaType: 'images' })
    assert.equal(res.status, 401)
  })
})