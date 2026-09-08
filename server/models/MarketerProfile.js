import mongoose from 'mongoose'

const payoutDetailsSchema = new mongoose.Schema(
  {
    ccp: { type: String, trim: true },
    baridiMob: { type: String, trim: true },
  },
  { _id: false }
)

const marketerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
    publicName: { type: String, trim: true },
    bio: String,
    avatar: String,
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    payoutDetails: { type: payoutDetailsSchema, default: () => ({}) },
    totalEarnings: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('MarketerProfile', marketerProfileSchema)
