import mongoose from 'mongoose'

export const PAYOUT_STATUSES = ['sent', 'received', 'disputed', 'cancelled']

const payoutSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    period: { type: String, trim: true },
    method: { type: String, enum: ['CCP', 'BaridiMob'], required: true },
    reference: String,
    commissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commission' }],
    notes: { type: String, trim: true, maxlength: 500 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: PAYOUT_STATUSES, default: 'sent' },
    sentAt: Date,
    confirmedAt: Date,
    disputedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
)

payoutSchema.index({ marketer: 1, status: 1 })
payoutSchema.index({ marketer: 1, period: 1 })
// Admin payout lists (optionally filtered by marketer/status) sort by creation time.
payoutSchema.index({ createdAt: -1 })

export default mongoose.model('Payout', payoutSchema)