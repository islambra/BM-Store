import mongoose from 'mongoose'

export const ORDER_STATUSES = [
  'pending-review',
  'customer-contacted',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'rejected',
  'cancelled',
]

const VALID_TRANSITIONS = {
  'pending-review': ['customer-contacted', 'confirmed', 'rejected'],
  'customer-contacted': ['confirmed', 'rejected'],
  'confirmed': ['processing', 'cancelled'],
  'processing': ['shipped', 'cancelled'],
  'shipped': ['delivered'],
  'delivered': [],
  'rejected': [],
  'cancelled': [],
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
    rewardDiscount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const deliverySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    wilaya: { type: String, required: true, trim: true },
    wilayaName: { type: String, trim: true },
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
    items: { type: [orderItemSchema], required: true },
    customer: { type: deliverySchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    delivery: { type: Number, required: true, min: 0 },
    rewardDiscount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending-review', index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketerProfile' },
    referralAttributed: { type: Boolean, default: false },
    commissionAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('Order', orderSchema)
