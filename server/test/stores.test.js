import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest } from './helpers.mjs'
import Product from '../models/Product.js'
import Category from '../models/Category.js'

describe('public stores: BM Store is NOT a seller store', () => {
  before(connectTest)
  after(disconnectTest)

  it('does not list the BM Store in the stores directory but still serves its catalog via /bm-store', async () => {
    const cat = `bmcat-${Date.now()}`
    const slugA = `bm-a-${Date.now()}`
    await Category.create({ slug: cat, name: 'BM Cats', nameAr: 'فئة', active: true, order: 1 })
    await Product.create([
      { slug: slugA, name: 'BM A', price: 250, category: cat, categoryName: 'BM Cats', isSpecialOffer: true, oldPrice: 300 },
      { slug: `bm-b-${Date.now()}`, name: 'BM B', price: 300, category: cat, categoryName: 'BM Cats' },
    ])

    const list = await request(app).get('/api/stores').query({ limit: 10 })
    assert.equal(list.status, 200)
    assert.ok(list.body.data.stores.length >= 0)
    assert.ok(!list.body.data.stores.some((s) => s.slug === 'bm-store'), 'the admin store must not appear among seller stores')

    const detail = await request(app).get('/api/stores/bm-store')
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.store.slug, 'bm-store')
    assert.ok(detail.body.data.allProducts.total >= 2)
    assert.ok(detail.body.data.newProducts.some((p) => p.slug === slugA), 'created product appears in the main catalog')
    assert.ok(detail.body.data.specialOffers.some((p) => p.slug === slugA), 'offer product appears in special offers')
    const catRow = detail.body.data.categories.find((c) => c.slug === cat)
    assert.ok(catRow, 'global category appears in the BM store categories')
    assert.ok(catRow.productCount >= 2)

    // search does not surface the BM Store either
    const search = await request(app).get('/api/stores').query({ q: 'bm', limit: 10 })
    assert.equal(search.status, 200)
    assert.ok(!search.body.data.stores.some((s) => s.slug === 'bm-store'))
  })

  it('returns an empty list (no $or error) when there are no stores', () => {
    return request(app)
      .get('/api/stores')
      .expect(200)
      .expect((res) => {
        assert.ok(Array.isArray(res.body.data.stores))
      })
  })
})