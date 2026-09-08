import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, trim: true, maxlength: 2000 },
    image: String,
    video: String,
    linkedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

postSchema.index({ createdAt: -1 })
postSchema.index({ author: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)
