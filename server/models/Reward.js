import mongoose from 'mongoose'

const rewardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    purchaseCount: { type: Number, default: 0, min: 0 },
    lastPurchaseAt: Date,
  },
  { timestamps: true }
)

rewardSchema.index({ user: 1, product: 1 }, { unique: true })

export function getRewardDiscount(count) {
  if (count >= 10) return 7
  if (count >= 1) return 5
  return 0
}

export default mongoose.model('Reward', rewardSchema)
