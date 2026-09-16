import pkg from '@google-cloud/translate/build/src/index.js'
const { Translate } = pkg

let client = null

const isConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLOUD_CREDENTIALS_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT_ID
  )

// Free fallback provider (MyMemory) is used when Google Cloud Translation is
// not configured. Set TRANSLATION_FALLBACK=off|none|false|0 to disable it and
// keep the original "store Arabic as-is" behaviour (used by the test suite).
const fallbackEnabled = () =>
  !/^(0|false|off|no|none)$/i.test(String(process.env.TRANSLATION_FALLBACK ?? '').trim())

// Detects Arabic script (U+0600–U+06FF). Text without Arabic characters is
// treated as already in a Latin script and is never sent to the API.
const containsArabic = (text) => /[\u0600-\u06FF]/.test(text)

function getClient() {
  if (client) return client
  const options = {}

  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    options.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  }

  if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
    try {
      options.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON)
    } catch (err) {
      console.error('[Translation] GOOGLE_CLOUD_CREDENTIALS_JSON is not valid JSON:', err.message)
    }
  }

  client = new Translate(options)
  return client
}

// Free, keyless fallback translation via the MyMemory public API.
// With a registered email (MYMEMORY_EMAIL) the per-day quota is raised.
async function translateWithMyMemory(text, targetLanguage, sourceLanguage) {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', `${sourceLanguage}|${targetLanguage}`)
  if (process.env.MYMEMORY_EMAIL) url.searchParams.set('de', process.env.MYMEMORY_EMAIL)

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`MyMemory returned HTTP ${res.status}`)

  const data = await res.json()
  const translated = data?.responseData?.translatedText
  if (data?.responseStatus !== 200 || !translated || /MYMEMORY WARNING|NO QUERY/i.test(translated)) {
    throw new Error('MyMemory returned no usable translation')
  }
  return translated
}

export async function translateText(text, targetLanguage = 'en', sourceLanguage = 'ar') {
  if (!text || typeof text !== 'string' || !text.trim()) return null
  const trimmed = text.trim()

  // Already in a Latin script — no translation required.
  if (!containsArabic(trimmed)) return trimmed

  if (isConfigured()) {
    try {
      const [translation] = await getClient().translate(trimmed, { from: sourceLanguage, to: targetLanguage })
      return typeof translation === 'string' ? translation : trimmed
    } catch (err) {
      console.error(`[Translation] Failed to translate "${trimmed.slice(0, 50)}...":`, err.message)
      throw err
    }
  }

  if (fallbackEnabled()) {
    try {
      const translation = await translateWithMyMemory(trimmed, targetLanguage, sourceLanguage)
      return translation || trimmed
    } catch (err) {
      console.warn(`[Translation] Free fallback translation failed for "${trimmed.slice(0, 50)}...":`, err.message)
      return trimmed
    }
  }

  console.warn('[Translation] No provider configured (TRANSLATION_FALLBACK=off) — storing Arabic content as-is.')
  return trimmed
}

export async function translateMultipleTexts(texts, targetLanguage = 'en', sourceLanguage = 'ar') {
  if (!Array.isArray(texts) || texts.length === 0) return []
  const filtered = texts.map((t) => (typeof t === 'string' && t.trim()) ? t.trim() : null)
  const hasAny = filtered.some(Boolean)
  if (!hasAny) return filtered.map(() => null)

  // Only strings containing Arabic characters need the API. Everything else
  // is returned unchanged, keeping array positions aligned.
  const needsTranslation = filtered.map((t) => Boolean(t && containsArabic(t)))
  const hasNeedingTranslation = needsTranslation.some(Boolean)
  if (!hasNeedingTranslation) return filtered

  const toTranslate = filtered
    .map((t, i) => ({ text: t, index: i }))
    .filter((x) => needsTranslation[x.index])

  if (isConfigured()) {
    try {
      const stringsToTranslate = toTranslate.map((x) => x.text)
      const [translations] = await getClient().translate(stringsToTranslate, { from: sourceLanguage, to: targetLanguage })
      const results = Array.isArray(translations) ? translations : [translations]
      const translatedByIndex = {}
      toTranslate.forEach((item, i) => {
        translatedByIndex[item.index] = typeof results[i] === 'string' ? results[i] : item.text
      })
      return filtered.map((original, i) => {
        if (!original) return null
        return translatedByIndex[i] ?? original
      })
    } catch (err) {
      console.error('[Translation] Batch translation failed:', err.message)
      throw err
    }
  }

  if (fallbackEnabled()) {
    try {
      const fallbacks = await Promise.all(
        toTranslate.map((x) => translateWithMyMemory(x.text, targetLanguage, sourceLanguage))
      )
      const translatedByIndex = {}
      toTranslate.forEach((item, i) => {
        translatedByIndex[item.index] = fallbacks[i] ?? item.text
      })
      return filtered.map((original, i) => {
        if (!original) return null
        return translatedByIndex[i] ?? original
      })
    } catch (err) {
      console.warn('[Translation] Free fallback batch translation failed — storing Arabic content as-is:', err.message)
      return filtered
    }
  }

  console.warn('[Translation] No provider configured (TRANSLATION_FALLBACK=off) — storing Arabic content as-is.')
  return filtered
}

export async function translateArabicToEnglish(text) {
  return translateText(text, 'en', 'ar')
}

export async function translateArabicFieldsToEnglish(fields) {
  const keys = Object.keys(fields)
  const values = keys.map((k) => fields[k])
  const results = await translateMultipleTexts(values, 'en', 'ar')
  const out = {}
  keys.forEach((k, i) => {
    out[k] = results[i]
  })
  return out
}