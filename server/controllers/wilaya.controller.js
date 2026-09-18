import Wilaya from '../models/Wilaya.js'
import { DEFAULT_DELIVERY_PRICE } from '../config/wilayas.js'
import { sendSuccess, sendError, asyncHandler } from '../utils/response.js'

// Defensive reads: documents written by the previous schema may still carry
// the old field names, so fall back to the default for missing values.
const priceOf = (w) =>
  typeof w.deliveryPrice === 'number' && Number.isFinite(w.deliveryPrice) ? Math.round(w.deliveryPrice) : DEFAULT_DELIVERY_PRICE
const activeOf = (w) => w.isActive !== false

const publicShape = (w) => ({
  _id: w._id,
  code: w.code,
  name: w.name,
  nameAr: w.nameAr,
  deliveryPrice: priceOf(w),
})

// Public — active wilayas with their delivery price, in display order.
export const getWilayas = asyncHandler(async (_req, res) => {
  const docs = await Wilaya.find({ isActive: true }).sort({ order: 1, code: 1 }).lean()
  return sendSuccess(res, docs.map(publicShape))
})

// ---- Admin ----

export const adminList = asyncHandler(async (_req, res) => {
  const wilayas = await Wilaya.find().sort({ order: 1, code: 1 }).lean()
  return sendSuccess(res, { wilayas, defaultPrice: DEFAULT_DELIVERY_PRICE })
})

export const adminUpdate = asyncHandler(async (req, res) => {
  const doc = await Wilaya.findOne({ code: req.params.code })
  if (!doc) return sendError(res, 'Wilaya not found', 404)

  const { deliveryPrice, isActive } = req.body ?? {}
  if (deliveryPrice !== undefined) {
    const price = Number(deliveryPrice)
    if (!Number.isFinite(price) || price < 0) {
      return sendError(res, 'Delivery price must be a number of 0 or more', 400)
    }
    doc.deliveryPrice = Math.round(price)
  }
  if (isActive !== undefined) doc.isActive = Boolean(isActive)

  await doc.save()
  return sendSuccess(res, doc, 'Delivery price updated')
})

/**
 * Resolves the destination wilaya for an order, entirely server-side.
 *
 * Prefers a Mongo `_id` ("wilayaId" — the payload the storefront sends today).
 * A legacy "wilaya" code is still accepted for backwards compatibility. The
 * delivery price is ALWAYS taken from the database — never from the client.
 *
 * Returns `{ wilayaId, wilayaName, wilayaCode, deliveryPrice }` or an error.
 */
export async function getDeliveryInfo({ wilayaId, wilaya, wilayaName } = {}) {
  if (wilayaId) {
    let doc = null
    try {
      doc = await Wilaya.findById(String(wilayaId)).lean()
    } catch {
      return { error: 'Please choose a valid wilaya' }
    }
    if (!doc || !activeOf(doc)) return { error: 'Please choose a valid wilaya' }
    return {
      wilayaId: doc._id,
      wilayaName: doc.name,
      wilayaCode: doc.code,
      deliveryPrice: priceOf(doc),
    }
  }

  if (wilaya) {
    const code = String(wilaya).trim()
    const doc = await Wilaya.findOne({ code }).lean()
    if (doc && activeOf(doc)) {
      return {
        wilayaId: doc._id,
        wilayaName: doc.name,
        wilayaCode: doc.code,
        deliveryPrice: priceOf(doc),
      }
    }
    // Legacy path: unknown/inactive code → flat default price. Keeps existing
    // orders and old tests (which send codes) working unchanged.
    return {
      wilayaId: null,
      wilayaName: wilayaName ? String(wilayaName).trim() : code,
      wilayaCode: code,
      deliveryPrice: DEFAULT_DELIVERY_PRICE,
    }
  }

  return { error: 'Missing delivery information' }
}