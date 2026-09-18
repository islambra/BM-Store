import Wilaya from '../models/Wilaya.js'
import Store from '../models/Store.js'
import StoreDelivery from '../models/StoreDelivery.js'
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
 * Seller-store default delivery price (fallback for wilayas the seller has not
 * configured individually, and for the legacy unknown-code path).
 */
async function storeDefaultPrice(storeId) {
  const store = storeId ? await Store.findById(storeId, 'defaultDeliveryPrice').lean() : null
  const dp = store?.defaultDeliveryPrice
  return typeof dp === 'number' && Number.isFinite(dp) && dp >= 0 ? Math.round(dp) : DEFAULT_DELIVERY_PRICE
}

/**
 * Resolves the delivery price for a seller store: a per-wilaya StoreDelivery
 * override wins, then the store's defaultDeliveryPrice, then the platform
 * default. BM Store orders (no storeId) use the global Wilaya price.
 */
async function sellerDeliveryPrice(storeId, wilayaId) {
  if (!storeId || !wilayaId) return null
  const override = await StoreDelivery.findOne({ store: storeId, wilaya: wilayaId }).lean()
  if (override) return Math.round(override.deliveryPrice)
  return storeDefaultPrice(storeId)
}

/**
 * Resolves the destination wilaya for an order, entirely server-side.
 *
 * Prefers a Mongo `_id` ("wilayaId" — the payload the storefront sends today).
 * A legacy "wilaya" code is still accepted for backwards compatibility. The
 * delivery price is ALWAYS taken from the database — never from the client.
 * Orders placed on a seller store (`storeId`) are priced with that store's own
 * delivery costs; BM Store orders use the global per-wilaya price.
 *
 * Returns `{ wilayaId, wilayaName, wilayaCode, deliveryPrice }` or an error.
 */
export async function getDeliveryInfo({ wilayaId, wilaya, wilayaName, storeId } = {}) {
  if (wilayaId) {
    let doc = null
    try {
      doc = await Wilaya.findById(String(wilayaId)).lean()
    } catch {
      return { error: 'Please choose a valid wilaya' }
    }
    if (!doc || !activeOf(doc)) return { error: 'Please choose a valid wilaya' }
    const sellerPrice = await sellerDeliveryPrice(storeId, doc._id)
    return {
      wilayaId: doc._id,
      wilayaName: doc.name,
      wilayaCode: doc.code,
      deliveryPrice: sellerPrice !== null ? sellerPrice : priceOf(doc),
    }
  }

  if (wilaya) {
    const code = String(wilaya).trim()
    const doc = await Wilaya.findOne({ code }).lean()
    if (doc && activeOf(doc)) {
      const sellerPrice = await sellerDeliveryPrice(storeId, doc._id)
      return {
        wilayaId: doc._id,
        wilayaName: doc.name,
        wilayaCode: doc.code,
        deliveryPrice: sellerPrice !== null ? sellerPrice : priceOf(doc),
      }
    }
    // Legacy path: unknown/inactive code → the store default (seller orders)
    // or the flat platform default (BM Store / old tests which send codes).
    return {
      wilayaId: null,
      wilayaName: wilayaName ? String(wilayaName).trim() : code,
      wilayaCode: code,
      deliveryPrice: storeId ? await storeDefaultPrice(storeId) : DEFAULT_DELIVERY_PRICE,
    }
  }

  return { error: 'Missing delivery information' }
}