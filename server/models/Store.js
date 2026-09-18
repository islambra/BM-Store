import mongoose from 'mongoose'

export const STORE_STATUSES = ['pending', 'active', 'expired', 'suspended', 'rejected', 'deleted']
export const SUBSCRIPTION_PLANS = ['monthly', 'yearly']

const storeSchema = new mongoose.Schema(
  {
    // One seller = one store. The unique index is the hard guarantee behind
    // the business rule (a second Store for the same seller is rejected with
    // a duplicate-key error, surfaced as a 409 by the global error handler).
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    descriptionAr: { type: String, trim: true, maxlength: 1000 },
    logo: { type: String },
    phone: { type: String, trim: true, maxlength: 30 },
    wilaya: { type: String, trim: true },
    city: { type: String, trim: true },
    status: { type: String, enum: STORE_STATUSES, default: 'pending', index: true },
    subscriptionPlan: { type: String, enum: SUBSCRIPTION_PLANS },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

storeSchema.index({ status: 1, subscriptionEndDate: 1 })

export default mongoose.model('Store', storeSchema)