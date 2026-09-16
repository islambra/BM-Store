import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  translateArabicToEnglish,
  translateArabicFieldsToEnglish,
} from '../services/translationService.js'

const savedEnv = {}

beforeEach(() => {
  for (const key of ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_CREDENTIALS_JSON', 'TRANSLATION_FALLBACK', 'MYMEMORY_EMAIL']) {
    savedEnv[key] = process.env[key]
  }
  delete process.env.GOOGLE_CLOUD_PROJECT_ID
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  delete process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
  delete process.env.TRANSLATION_FALLBACK
  delete process.env.MYMEMORY_EMAIL
})

afterEach(() => {
  for (const key of Object.keys(savedEnv)) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
})

describe('translationService free fallback', () => {
  it('translates Arabic to English via MyMemory when Google Cloud is not configured', async () => {
    const calls = []
    global.fetch = async (url) => {
      calls.push(String(url))
      return {
        ok: true,
        json: async () => ({
          responseStatus: 200,
          responseData: { translatedText: 'Welcome to the store' },
        }),
      }
    }

    const english = await translateArabicToEnglish('مرحبا بكم في المتجر')
    assert.equal(english, 'Welcome to the store')
    const queried = new URL(calls[0])
    assert.equal(queried.searchParams.get('q'), 'مرحبا بكم في المتجر')
    assert.equal(queried.searchParams.get('langpair'), 'ar|en')
  })

  it('translates multiple Arabic fields, keeping array alignment', async () => {
    global.fetch = async (url) => {
      const q = new URL(url).searchParams.get('q')
      if (q === 'اسم المنتج') {
        return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Product name' } }) }
      }
      if (q === 'وصف المنتج') {
        return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Product description' } }) }
      }
      throw new Error('Unexpected request: ' + url)
    }

    const out = await translateArabicFieldsToEnglish({
      nameAr: 'اسم المنتج',
      descriptionAr: 'وصف المنتج',
    })
    assert.equal(out.nameAr, 'Product name')
    assert.equal(out.descriptionAr, 'Product description')
  })

  it('falls back to storing Arabic as-is when the free provider fails', async () => {
    global.fetch = async () => ({ ok: false, status: 500 })
    const english = await translateArabicToEnglish('لو عاد الخطأ')
    assert.equal(english, 'لو عاد الخطأ')
  })

  it('returns Latin-script text as-is without calling any provider', async () => {
    let called = false
    global.fetch = async () => {
      called = true
      throw new Error('should not be called')
    }
    const out = await translateArabicToEnglish('Hello world')
    assert.equal(out, 'Hello world')
    assert.equal(called, false)
  })

  it('returns null for empty input', async () => {
    global.fetch = async () => {
      throw new Error('should not be called')
    }
    assert.equal(await translateArabicToEnglish('  '), null)
  })
})