import 'dotenv/config'
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import { connectTest, disconnectTest, createUser, createMarketer, uniquePhone } from './helpers.mjs'
import MarketerProfile from '../models/MarketerProfile.js'

const phone = uniquePhone

async function marketerAgent() {
  const number = phone()
  await request(app).post('/api/auth/register').send({ name: 'Marketer Candidate', phone: number, password: 'Secret@1234' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ phone: number, password: 'Secret@1234' })
  const upgrade = await agent.post('/api/auth/become-marketer')
  assert.equal(upgrade.status, 201)
  return { agent, code: upgrade.body.data.marketer.referralCode, marketerId: upgrade.body.data.user.id }
}

describe('marketer marketing + referrals', () => {
  before(connectTest)
  after(disconnectTest)

  it('issues unique referral codes per marketer', async () => {
    const a = await marketerAgent()
    const b = await marketerAgent()
    assert.match(a.code, /^[0-9A-F]{10}$/)
    assert.notEqual(a.code, b.code)
  })

  it('marketer dashboard exposes referral link and payout details', async () => {
    const { agent, marketerId, code } = await marketerAgent()
    const res = await agent.get(`/api/marketer/me`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.profile.referralCode, code)
    assert.ok(res.body.data.profile.referralLink.includes(code))
    assert.ok(res.body.data.profile.payoutDetails)
  })

  it('tracks a referral visit for an active marketer', async () => {
    const { code } = await marketerAgent()
    const res = await request(app).post('/api/marketing/track').send({ referralCode: code, path: '/category/spices' })
    assert.equal(res.status, 201)
    assert.ok(res.body.data.referralId)

    const profile = await MarketerProfile.findOne({ referralCode: code }).lean()
    const visits = await import('../models/Referral.js').then((m) => m.default.countDocuments({ profile: profile._id }))
    assert.equal(visits, 1)
  })

  it('rejects unknown or suspended referral codes', async () => {
    const res = await request(app).post('/api/marketing/track').send({ referralCode: 'NOPE1234' })
    assert.equal(res.status, 404)
  })
})
