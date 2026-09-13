import pkg from '@google-cloud/translate/build/src/index.js'
const { Translate } = pkg

let client = null

const isConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLOUD_CREDENTIALS_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT_ID
  )

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

export async function translateText(text, targetLanguage = 'en', sourceLanguage = 'ar') {
  if (!text || typeof text !== 'string' || !text.trim()) return null
  const trimmed = text.trim()

  // Already in a Latin script — no translation required.
  if (!containsArabic(trimmed)) return trimmed

  if (!isConfigured()) {
    console.warn('[Translation] Google Cloud Translation is not configured — storing Arabic content as-is (no English fallback).')
    return trimmed
  }

  try {
    const [translation] = await getClient().translate(trimmed, { from: sourceLanguage, to: targetLanguage })
    return typeof translation === 'string' ? translation : trimmed
  } catch (err) {
    console.error(`[Translation] Failed to translate "${trimmed.slice(0, 50)}...":`, err.message)
    throw err
  }
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

  if (!isConfigured()) {
    console.warn('[Translation] Google Cloud Translation is not configured — storing Arabic content as-is (no English fallback).')
    return filtered
  }

  try {
    const toTranslate = filtered
      .map((t, i) => ({ text: t, index: i }))
      .filter((x) => needsTranslation[x.index])
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