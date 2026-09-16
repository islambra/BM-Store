import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createAdmin, createCategory } from './helpers.mjs'

// Required 8 data-driven categories with these server slugs.
const REQUIRED = [
  'spices', 'cosmetics', 'baking', 'nuts',
  'legumes', 'natural-mixes', 'dried-fruits', 'oils-honey',
]

describe('categories', () => {
  before(connectTest)
  beforeEach(async () => {
    await clearCollection('categories')
    await clearCollection('products')
  })
  after(disconnectTest)

  async function adminHeaders() {
    const { phone, password } = await createAdmin()
    const login = await request(app).post('/api/auth/login').send({ phone, password })
    return { Authorization: `Bearer ${login.headers['set-cookie'][0].split(';')[0].split('=')[1]}` }
  }

  it('public list exposes only active categories in order', async () => {
    await createCategory({ slug: 'spices', name: 'Spices', order: 2 })
    await createCategory({ slug: 'nuts', name: 'Nuts', order: 1 })
    await createCategory({ slug: 'hidden', name: 'Hidden', active: false, order: 3 })

    const res = await request(app).get('/api/categories')
    assert.equal(res.status, 200)
    const slugs = res.body.data.map((c) => c.slug)
    assert.deepEqual(slugs, ['nuts', 'spices'])
  })

  it('admin creates a category; duplicate slug is rejected', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ slug: 'spices', name: 'Spices' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'spices')

    const dup = await request(app).post('/api/admin/categories').set(h).send({ slug: 'Spices', name: 'Duplicate' })
    assert.equal(dup.status, 409)
  })

  it('auto-generates a slug when omitted', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ name: 'Fresh Honey' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'fresh-honey')
  })

  it('USER cannot create categories', async () => {
    const res = await request(app).post('/api/admin/categories').send({ slug: 'spices', name: 'Spices' })
    assert.equal(res.status, 401)
  })

  it('admin updates and deletes categories', async () => {
    const h = await adminHeaders()
    const created = await request(app).post('/api/admin/categories').set(h).send({ slug: 'nuts', name: 'Nuts' })
    const id = created.body.data._id

    const updated = await request(app).patch(`/api/admin/categories/${id}`).set(h).send({ name: 'Nuts & Seeds' })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.name, 'Nuts & Seeds')

    const deleted = await request(app).delete(`/api/admin/categories/${id}`).set(h)
    assert.equal(deleted.status, 200)
  })

  it('required category slugs are present in the storefront', async () => {
    for (const slug of REQUIRED) await createCategory({ slug })
    const res = await request(app).get('/api/categories')
    const slugs = res.body.data.map((c) => c.slug).sort()
    assert.deepEqual(slugs, [...REQUIRED].sort())
  })
})