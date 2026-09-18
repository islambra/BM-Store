import mongoose from 'mongoose'

// Per-store delivery pricing: each document overrides the delivery price for
// one wilaya for one seller store. A wilaya with no override falls back to the
// store's `defaultDeliveryPrice`, then to the platform DEFAULT_DELIVERY_PRICE.
// BM Store orders always use the global Wilaya pricing (no store).
const storeDeliverySchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    wilaya: { type: mongoose.Schema.Types.ObjectId, ref: 'Wilaya', required: true },
    deliveryPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

storeDeliverySchema.index({ store: 1, wilaya: 1 }, { unique: true })

export default mongoose.model('StoreDelivery', storeDeliverySchema)