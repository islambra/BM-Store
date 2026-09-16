import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    textEn: { type: String, trim: true, maxlength: 2000 },
    textAr: { type: String, trim: true, maxlength: 2000 },
    mediaType: { type: String, enum: ['images', 'video'], default: 'images' },
    images: { type: [String], default: [] },
    video: { type: String, default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  },
  { timestamps: true }
)

postSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)
