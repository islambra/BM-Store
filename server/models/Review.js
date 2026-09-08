import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100 },
    text: { type: String, trim: true, maxlength: 1000 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

reviewSchema.index({ product: 1, user: 1 }, { unique: true })
reviewSchema.index({ product: 1, active: 1, createdAt: -1 })

export default mongoose.model('Review', reviewSchema)
