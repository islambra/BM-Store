import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createAdmin, createProduct } from './helpers.mjs'
import Product from '../models/Product.js'

async function adminAgent() {
  const { phone, password } = await createAdmin()
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone, password })
  return agent
}

describe('catalog: best sellers, special offers, images, multilingual', () => {
  before(connectTest)
  after(disconnectTest)

  it('sorts best-selling by confirmedSales desc then createdAt desc', async () => {
    const cat = `cat-${Date.now()}`
    await Product.create([
      { slug: `bs-a-${Date.now()}`, name: 'BS A', price: 100, category: cat, categoryName: 'Cat', confirmedSales: 5, createdAt: new Date('2026-01-01') },
      { slug: `bs-b-${Date.now()}`, name: 'BS B', price: 100, category: cat, categoryName: 'Cat', confirmedSales: 10, createdAt: new Date('2026-01-02') },
      { slug: `bs-c-${Date.now()}`, name: 'BS C', price: 100, category: cat, categoryName: 'Cat', confirmedSales: 10, createdAt: new Date('2026-01-01') },
    ])

    const res = await request(app).get('/api/products').query({ sort: 'best-selling', category: cat, limit: 10 })
    assert.equal(res.status, 200)
    const names = res.body.data.products.map((p) => p.name)
    assert.deepEqual(names, ['BS B', 'BS C', 'BS A'])
  })

  it('makes an admin-created BM product visible on the storefront', async () => {
    const agent = await adminAgent()
    const created = await agent.post('/api/admin/products').send({
      nameAr: 'زعتر حر',
      descriptionAr: 'زعتر جبلي فاخر',
      price: 500,
      oldPrice: 0,
      category: `cat-${Date.now()}`,
      categoryName: 'Cat',
      images: ['/uploads/photo.jpg'],
    })
    assert.equal(created.status, 201)
    const id = created.body.data._id
    const raw = await Product.findById(id).lean()
    assert.equal(raw.ownerType, 'BM_STORE')

    const list = await request(app).get('/api/products').query({ limit: 50 })
    assert.equal(list.status, 200)
    assert.ok(list.body.data.products.some((p) => String(p._id) === id), 'product must appear in the public catalog')

    const bySlug = await request(app).get(`/api/products/slug/${raw.slug}`)
    assert.equal(bySlug.status, 200)
    assert.equal(String(bySlug.body.data._id), id)

    await Product.updateOne({ _id: id }, { confirmedSales: 9999 })
    const best = await request(app).get('/api/products').query({ sort: 'best-selling', limit: 10 })
    assert.equal(best.status, 200)
    assert.equal(String(best.body.data.products[0]._id), id, 'new admin product must rank first in best selling')
  })

  it('filters special offers via offer=true', async () => {
    const cat = `cat-${Date.now()}`
    await Product.create([
      { slug: `of-a-${Date.now()}`, name: 'Offer A', price: 100, oldPrice: 150, category: cat, categoryName: 'Cat', isSpecialOffer: true },
      { slug: `of-b-${Date.now()}`, name: 'Offer B', price: 200, category: cat, categoryName: 'Cat', isSpecialOffer: false },
    ])

    const res = await request(app).get('/api/products').query({ offer: 'true', category: cat, limit: 10 })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.data.products.map((p) => p.name), ['Offer A'])
  })

  it('computes discount dynamically for special offers only', async () => {
    const p = await createProduct({ name: 'Discounted', price: 1200 })
    await Product.updateOne({ _id: p._id }, { $set: { oldPrice: 2000, discount: 5, isSpecialOffer: true } })
    const res = await request(app).get(`/api/products/${p._id}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.discount, 40)
    assert.equal(res.body.data.price, 1200)
    assert.equal(res.body.data.oldPrice, 2000)
  })

  it('never exposes discounts or old prices for normal products', async () => {
    const p = await createProduct({ name: 'Normal Price Only', price: 1000 })
    await Product.updateOne({ _id: p._id }, { $set: { oldPrice: 1500, discount: 33 } })
    const res = await request(app).get(`/api/products/${p._id}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.discount, 0)
    assert.equal(res.body.data.oldPrice, undefined)
  })

  it('clears the old price when a product is moved out of special offers', async () => {
    const agent = await adminAgent()
    const created = await agent.post('/api/admin/products').send({
      name: 'Offer to Normal',
      price: 900,
      oldPrice: 1200,
      category: 'spices',
      isSpecialOffer: true,
    })
    assert.equal(created.status, 201)
    const id = created.body.data._id

    const updated = await agent.patch(`/api/admin/products/${id}`).send({ isSpecialOffer: false })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.isSpecialOffer, false)
    assert.equal(updated.body.data.oldPrice, undefined)

    const pub = await request(app).get(`/api/products/${id}`)
    assert.equal(pub.status, 200)
    assert.equal(pub.body.data.discount, 0)
    assert.equal(pub.body.data.oldPrice, undefined)
  })

  it('rejects toggling a product into a special offer without a valid old price', async () => {
    const agent = await adminAgent()
    const created = await agent.post('/api/admin/products').send({
      name: 'Toggle Invalid',
      price: 500,
      category: 'spices',
    })
    const id = created.body.data._id

    const bad = await agent.patch(`/api/admin/products/${id}/toggle`).send({ isSpecialOffer: true })
    assert.equal(bad.status, 400)

    const promo = await agent.patch(`/api/admin/products/${id}`).send({ isSpecialOffer: true, oldPrice: 700 })
    assert.equal(promo.status, 200)
    assert.equal(promo.body.data.isSpecialOffer, true)
    assert.equal(promo.body.data.oldPrice, 700)

    const off = await agent.patch(`/api/admin/products/${id}/toggle`).send({ isSpecialOffer: false })
    assert.equal(off.status, 200)
    assert.equal(off.body.data.isSpecialOffer, false)
    assert.equal(off.body.data.oldPrice, undefined)
  })

  it('stores Latin-script content as-is without calling the translation API', async () => {
    const agent = await adminAgent()
    const res = await agent.post('/api/admin/products').send({
      name: 'Multilingual Product',
      nameAr: 'Multilingual Product',
      description: 'English description',
      descriptionAr: 'English description',
      price: 1500,
      category: 'spices',
      categoryName: 'Spices',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.name, 'Multilingual Product')
    assert.equal(res.body.data.description, 'English description')
    assert.equal(res.body.data.nameFr, undefined)
    assert.equal(res.body.data.descriptionFr, undefined)
  })

  it('stores Arabic content as-is when translation is not configured instead of failing', async () => {
    const agent = await adminAgent()
    const nameAr = 'منتج متعدد اللغات'
    const descriptionAr = 'وصف بالعربية'
    const res = await agent.post('/api/admin/products').send({
      nameAr,
      descriptionAr,
      price: 1500,
      category: 'spices',
      categoryName: 'Spices',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.nameAr, nameAr)
    assert.equal(res.body.data.descriptionAr, descriptionAr)
    assert.equal(res.body.data.name, nameAr)
    assert.equal(res.body.data.description, descriptionAr)
  })

  it('enforces a maximum of 5 product images', async () => {
    const agent = await adminAgent()
    const images = Array.from({ length: 6 }, (_, i) => `/img/${i}.jpg`)
    const res = await agent.post('/api/admin/products').send({
      name: 'Image Limited',
      price: 900,
      category: 'nuts',
      categoryName: 'Nuts',
      images,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.images.length, 5)
  })

  it('requires oldPrice above price for special offers on create', async () => {
    const agent = await adminAgent()
    const without = await agent.post('/api/admin/products').send({
      name: 'Bad Offer 1',
      price: 900,
      category: 'spices',
      isSpecialOffer: true,
    })
    assert.equal(without.status, 400)

    const inverted = await agent.post('/api/admin/products').send({
      name: 'Bad Offer 2',
      price: 900,
      oldPrice: 800,
      category: 'spices',
      isSpecialOffer: true,
    })
    assert.equal(inverted.status, 400)

    const good = await agent.post('/api/admin/products').send({
      name: 'Good Offer',
      price: 900,
      oldPrice: 1200,
      category: 'spices',
      isSpecialOffer: true,
    })
    assert.equal(good.status, 201)
    assert.equal(good.body.data.isSpecialOffer, true)
  })

  it('validates special offer when toggled via admin update', async () => {
    const agent = await adminAgent()
    const created = await agent.post('/api/admin/products').send({
      name: 'Toggle Offer',
      price: 500,
      category: 'spices',
    })
    const id = created.body.data._id

    const bad = await agent.patch(`/api/admin/products/${id}`).send({ isSpecialOffer: true })
    assert.equal(bad.status, 400)

    const good = await agent.patch(`/api/admin/products/${id}`).send({ isSpecialOffer: true, oldPrice: 700 })
    assert.equal(good.status, 200)
    assert.equal(good.body.data.isSpecialOffer, true)
  })
})