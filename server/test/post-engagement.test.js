import 'dotenv/config'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, clearCollection, createUser, createAdmin, createProduct } from './helpers.mjs'
import Comment from '../models/Comment.js'
import Reaction from '../models/Reaction.js'

describe('post engagement (likes, comments, share support)', () => {
  before(connectTest)
  beforeEach(async () => {
    await clearCollection('posts')
    await clearCollection('comments')
    await clearCollection('reactions')
  })
  after(disconnectTest)

  async function publishedPost() {
    const admin = await createAdmin()
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ email: admin.email, password: admin.password })
    const product = await createProduct()
    const res = await adminAgent.post('/api/admin/posts').send({
      textEn: 'Hello post',
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
      status: 'published',
    })
    return { id: res.body.data._id }
  }

  async function userAgent() {
    const u = await createUser()
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email: u.email, password: u.password })
    return agent
  }

  it('guest cannot like or comment on a post', async () => {
    const { id } = await publishedPost()
    const like = await request(app).post(`/api/posts/${id}/like`)
    assert.equal(like.status, 401)
    const comment = await request(app).post(`/api/posts/${id}/comments`).send({ text: 'hi' })
    assert.equal(comment.status, 401)
  })

  it('user likes a post and cannot duplicate the like', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    const first = await agent.post(`/api/posts/${id}/like`)
    assert.equal(first.status, 200)
    assert.equal(first.body.data.liked, true)
    assert.equal(first.body.data.likesCount, 1)

    const again = await agent.post(`/api/posts/${id}/like`)
    assert.equal(again.body.data.liked, true)
    assert.equal(again.body.data.likesCount, 1)
  })

  it('user can unlike a post', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    await agent.post(`/api/posts/${id}/like`)
    const unliked = await agent.delete(`/api/posts/${id}/like`)
    assert.equal(unliked.body.data.liked, false)
    assert.equal(unliked.body.data.likesCount, 0)
  })

  it('public post list exposes real counts and userLiked for the viewer', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    await agent.post(`/api/posts/${id}/like`)
    await agent.post(`/api/posts/${id}/comments`).send({ text: 'Nice!' })

    const guest = await request(app).get('/api/posts')
    assert.equal(guest.body.data.posts[0].likesCount, 1)
    assert.equal(guest.body.data.posts[0].commentsCount, 1)
    assert.equal(guest.body.data.posts[0].userLiked, false)

    const logged = await agent.get('/api/posts')
    assert.equal(logged.body.data.posts[0].userLiked, true)

    const single = await agent.get(`/api/posts/${id}`)
    assert.equal(single.body.data.userLiked, true)
    assert.equal(single.body.data.likesCount, 1)
  })

  it('creates a comment and returns a safe author object', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    const res = await agent.post(`/api/posts/${id}/comments`).send({ text: 'Great product!' })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.text, 'Great product!')
    assert.equal(res.body.data.author.name, 'Test User')
    assert.equal(res.body.data.author.email, undefined)
    assert.equal(res.body.data.author.phone, undefined)

    const list = await agent.get(`/api/posts/${id}/comments`)
    assert.equal(list.body.data.total, 1)
    assert.equal(list.body.data.comments[0].author.name, 'Test User')
  })

  it('rejects empty or oversized comments', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    const empty = await agent.post(`/api/posts/${id}/comments`).send({ text: '   ' })
    assert.equal(empty.status, 400)
    const long = await agent.post(`/api/posts/${id}/comments`).send({ text: 'x'.repeat(1001) })
    assert.equal(long.status, 400)
  })

  it('only the owner can edit their comment', async () => {
    const { id } = await publishedPost()
    const a = await userAgent()
    const b = await userAgent()
    const created = await a.post(`/api/posts/${id}/comments`).send({ text: 'Original' })
    const commentId = created.body.data._id

    const denied = await b.put(`/api/comments/${commentId}`).send({ text: 'Hacked' })
    assert.equal(denied.status, 403)

    const edited = await a.put(`/api/comments/${commentId}`).send({ text: 'Edited' })
    assert.equal(edited.status, 200)
    assert.equal(edited.body.data.text, 'Edited')
  })

  it('owner can delete their comment; admin can delete any comment', async () => {
    const { id } = await publishedPost()
    const a = await userAgent()
    const admin = await createAdmin()
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ email: admin.email, password: admin.password })

    const created = await a.post(`/api/posts/${id}/comments`).send({ text: 'Delete me' })
    const commentId = created.body.data._id

    const b = await userAgent()
    const denied = await b.delete(`/api/comments/${commentId}`)
    assert.equal(denied.status, 403)

    const asAdmin = await adminAgent.delete(`/api/comments/${commentId}`)
    assert.equal(asAdmin.status, 200)

    const newOne = await a.post(`/api/posts/${id}/comments`).send({ text: 'Owner delete' })
    const own = await a.delete(`/api/comments/${newOne.body.data._id}`)
    assert.equal(own.status, 200)

    const list = await a.get(`/api/posts/${id}/comments`)
    assert.equal(list.body.data.total, 0)
  })

  it('comment count updates and pages correctly', async () => {
    const { id } = await publishedPost()
    const agent = await userAgent()
    for (let i = 0; i < 9; i++) {
      await agent.post(`/api/posts/${id}/comments`).send({ text: `comment ${i}` })
    }
    const page1 = await agent.get(`/api/posts/${id}/comments`)
    assert.equal(page1.body.data.comments.length, 8)
    assert.equal(page1.body.data.pages, 2)
    const page2 = await agent.get(`/api/posts/${id}/comments?page=2`)
    assert.equal(page2.body.data.comments.length, 1)

    const posts = await agent.get('/api/posts')
    assert.equal(posts.body.data.posts[0].commentsCount, 9)
  })

  it('deleting a post removes its likes and comments', async () => {
    const admin = await createAdmin()
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ email: admin.email, password: admin.password })
    const product = await createProduct()
    const created = await adminAgent.post('/api/admin/posts').send({
      mediaType: 'images',
      images: ['/uploads/a.jpg'],
      productId: String(product._id),
      status: 'published',
    })
    const id = created.body.data._id

    const agent = await userAgent()
    await agent.post(`/api/posts/${id}/like`)
    await agent.post(`/api/posts/${id}/comments`).send({ text: 'bye' })

    await adminAgent.delete(`/api/admin/posts/${id}`)

    const gone = await request(app).get(`/api/posts/${id}`)
    assert.equal(gone.status, 404)
    const orphanComments = await Comment.countDocuments({ post: id })
    assert.equal(orphanComments, 0)
    const orphanReactions = await Reaction.countDocuments({ post: id })
    assert.equal(orphanReactions, 0)
  })
})