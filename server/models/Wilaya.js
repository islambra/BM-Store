import mongoose from 'mongoose'

// Delivery pricing per Algerian wilaya. Seeded once with every wilaya at the
// default price; the admin can then change each one from the dashboard.
const wilayaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    deliveryPrice: { type: Number, default: 350, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

wilayaSchema.index({ isActive: 1, order: 1 })

export default mongoose.model('Wilaya', wilayaSchema)