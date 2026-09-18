import mongoose from 'mongoose'

export const STORE_REQUEST_STATUSES = ['pending', 'approved', 'rejected']

const storeRequestSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    // Seller information
    sellerName: { type: String, required: true, trim: true },
    sellerEmail: { type: String, required: true, lowercase: true, trim: true },
    sellerPhone: { type: String, required: true, trim: true },
    // Store information
    storeName: { type: String, required: true, trim: true },
    storeDescription: { type: String, trim: true },
    storeDescriptionAr: { type: String, trim: true },
    storeLogo: { type: String },
    storePhone: { type: String, trim: true },
    wilaya: { type: String, trim: true },
    city: { type: String, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    // Subscription
    subscriptionPlan: { type: String, enum: ['monthly', 'yearly'], required: true },
    expectedAmount: { type: Number, required: true, min: 0 },
    paymentProof: { type: String, required: true },
    // Request details
    status: { type: String, enum: STORE_REQUEST_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, trim: true },
    requestDate: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // If this is a renewal request
    isRenewal: { type: Boolean, default: false },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  },
  { timestamps: true }
)

export default mongoose.model('StoreRequest', storeRequestSchema)