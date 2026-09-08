import mongoose from 'mongoose'

export const COMMISSION_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED']

const commissionSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    orderId: { type: String, index: true },
    rate: { type: Number, min: 0, max: 100, default: 10 },
    amount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: COMMISSION_STATUSES, default: 'PENDING', index: true },
    paidAt: Date,
  },
  { timestamps: true }
)

commissionSchema.index({ marketer: 1, status: 1 })

export default mongoose.model('Commission', commissionSchema)
