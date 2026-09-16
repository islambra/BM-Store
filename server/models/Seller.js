import mongoose from 'mongoose'

export const SELLER_STATUSES = ['active', 'suspended']

const sellerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, required: true, trim: true, maxlength: 30, unique: true },
    status: { type: String, enum: SELLER_STATUSES, default: 'active', index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Seller', sellerSchema)