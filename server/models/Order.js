import mongoose from 'mongoose'

export const ORDER_STATUSES = ['pending', 'confirmed', 'delivered', 'rejected', 'cancelled']

export const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  rejected: [],
  cancelled: [],
}

export function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: String,
    // Reward snapshots: taken when the order is confirmed, so later config
    // changes never alter historical orders.
    category: String,
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    isRewardMilestone: { type: Boolean, default: false },
  },
  { _id: false }
)

const deliverySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    // Wilaya snapshot: frozen at order time so historical orders keep their
    // original fee even if the admin later changes the wilaya's price.
    // `wilaya` (the code) is kept for backwards compatibility with existing
    // reads; `wilayaId`/`wilayaCode`/`deliveryPrice` are the full snapshot.
    wilaya: { type: String, required: true, trim: true },
    wilayaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wilaya' },
    wilayaCode: { type: String, trim: true },
    wilayaName: { type: String, trim: true },
    deliveryPrice: { type: Number, min: 0 },
    commune: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    orderRef: { type: String, unique: true, required: true, uppercase: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    items: { type: [orderItemSchema], required: true },
    customer: { type: deliverySchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    delivery: { type: Number, required: true, min: 0 },
    // Customer reward discount. Set by the server when a BM Store order is
    // confirmed: the personal order number (assigning it at confirmation is
    // what makes only confirmed orders count) drives the per-category reward.
    // discountPercent here is the blended order-level figure; per-line values
    // live on each order item. Legacy orders keep their old creation-time
    // values untouched.
    customerOrderNumber: { type: Number, min: 1, index: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Idempotency key supplied by the client (one stable key per checkout
    // attempt). Retried/double-clicked submissions reuse it and return the
    // original order instead of allocating a second personal order number.
    clientKey: { type: String, trim: true, maxlength: 80 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketerProfile', index: true },
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    referralCode: { type: String },
    referredAt: Date,
    referralAttributed: { type: Boolean, default: false },
    commissionAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ store: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
// NOTE: the per-customer reward number uniqueness is enforced by a partial
// index created in config/rewardMigrations.js (kept out of the schema on
// purpose: a legacy sparse index with the same name must be dropped first, and
// the partial filter excludes pending/cancelled/rejected orders which carry no
// number — a compound sparse index treats their missing field as null and
// collides).
// Idempotency: one checkout attempt (user + clientKey) maps to one order.
orderSchema.index({ user: 1, clientKey: 1 }, { unique: true, sparse: true })

export default mongoose.model('Order', orderSchema)
