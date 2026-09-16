import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    nameAr: String,
    nameFr: String,
    image: String,
    icon: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    // Reward discount config — BM Store categories only (no `store`). Seller
    // categories must never set these (enforced in the admin rewards API).
    rewardEnabled: { type: Boolean, default: false },
    rewardNormalPercent: { type: Number, default: 0, min: 0, max: 100 },
    rewardSpecialPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
)

categorySchema.index({ active: 1, order: 1 })
categorySchema.index({ store: 1, slug: 1 }, { unique: true })

export default mongoose.model('Category', categorySchema)