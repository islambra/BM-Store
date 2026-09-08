import mongoose from 'mongoose'

const payoutSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    period: { type: String, required: true, trim: true },
    method: { type: String, enum: ['CCP', 'BaridiMob'], required: true },
    reference: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  },
  { timestamps: true }
)

payoutSchema.index({ marketer: 1, period: 1 })

export default mongoose.model('Payout', payoutSchema)
