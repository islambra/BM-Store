import mongoose from 'mongoose'

export const OWNER_TYPES = ['BM_STORE', 'SELLER']

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
    isFeatured: { type: Boolean, default: false, index: true },
    isSpecialOffer: { type: Boolean, default: false, index: true },
    // Tracked for BM Store (admin) products only; seller products have no
    // stock. Decremented on order confirm, restored on cancel / hard delete.
    stock: { type: Number, default: 0, min: 0 },
    confirmedSales: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    ownerType: { type: String, enum: OWNER_TYPES, default: 'BM_STORE', index: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
  },
  { timestamps: true }
)

productSchema.index({ confirmedSales: -1, createdAt: 1 })
productSchema.index({ name: 'text', nameAr: 'text', nameFr: 'text', description: 'text', descriptionAr: 'text', descriptionFr: 'text' })

export default mongoose.model('Product', productSchema)
