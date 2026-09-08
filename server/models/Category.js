import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    nameAr: String,
    nameFr: String,
    image: String,
    icon: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

categorySchema.index({ active: 1, order: 1 })

export default mongoose.model('Category', categorySchema)