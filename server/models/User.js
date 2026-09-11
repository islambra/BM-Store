import mongoose from 'mongoose'

export const ROLES = ['USER', 'MARKETER', 'ADMIN']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'USER', index: true },
    avatar: String,
    addresses: [
      {
        label: String,
        line1: String,
        line2: String,
        wilaya: String,
        commune: String,
        country: String,
      },
    ],
  },
  { timestamps: true }
)

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    role: this.role,
    avatar: this.avatar,
    phone: this.phone,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('User', userSchema)
