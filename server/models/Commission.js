import mongoose from 'mongoose'

export const COMMISSION_STATUSES = [
  'PENDING',
  'AVAILABLE',
  'PAYOUT_REQUESTED',
  'PAYMENT_SENT',
  'RECEIVED',
  'DISPUTED',
  'CANCELLED',
]

const commissionSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderId: { type: String, index: true },
    rate: { type: Number, min: 0, max: 100, default: 10 },
    amount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: COMMISSION_STATUSES, default: 'PENDING', index: true },
    availableAt: Date,
    paidAt: Date,
  },
  { timestamps: true }
)

commissionSchema.index({ marketer: 1, status: 1 })
commissionSchema.index({ order: 1 }, { unique: true, sparse: true })

export default mongoose.model('Commission', commissionSchema)
