import mongoose from 'mongoose'

const referralSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketerProfile', index: true },
    referralCode: { type: String, required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    landingPath: { type: String, default: '/' },
    visitor: { type: String, index: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, index: true },
    converted: { type: Boolean, default: false },
    convertedAt: Date,
  },
  { timestamps: true }
)

referralSchema.index({ marketer: 1, createdAt: -1 })
referralSchema.index({ referralCode: 1, createdAt: -1 })
referralSchema.index({ active: 1, visitor: 1, createdAt: -1 })
referralSchema.index({ active: 1, customer: 1, createdAt: -1 })

export default mongoose.model('Referral', referralSchema)
