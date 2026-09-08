import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: String,
    nameFr: String,
    slug: { type: String, unique: true, required: true, lowercase: true, trim: true },
    description: String,
    descriptionAr: String,
    descriptionFr: String,
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    image: String,
    images: [String],
    thumbnail: String,
    category: { type: String, required: true, index: true },
    categoryName: String,
    tags: [String],
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isSpecialOffer: { type: Boolean, default: false, index: true },
    isRewardEligible: { type: Boolean, default: false },
    confirmedSales: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

productSchema.index({ category: 1, isActive: 1 })
productSchema.index({ isActive: 1, isFeatured: 1 })
productSchema.index({ isSpecialOffer: 1, isActive: 1 })
productSchema.index({ confirmedSales: -1, createdAt: 1 })
productSchema.index({ name: 'text', nameAr: 'text', nameFr: 'text', description: 'text', descriptionAr: 'text', descriptionFr: 'text' })

export default mongoose.model('Product', productSchema)
