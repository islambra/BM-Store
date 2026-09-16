import mongoose from 'mongoose'

/**
 * Singleton settings document for the BM Store reward discount system.
 * A single document is kept (upserted lazily); the master switch here guards
 * every category config: when `rewardSystemEnabled` is false, NO reward
 * discount is applied anywhere, regardless of per-category percentages.
 */
const rewardSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'reward-settings', unique: true },
    rewardSystemEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
)

rewardSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne({ singleton: 'reward-settings' }).lean()
  if (!doc) {
    try {
      doc = await this.create({ singleton: 'reward-settings' })
      doc = doc.toObject()
    } catch (e) {
      if (e.code !== 11000) throw e
      doc = await this.findOne({ singleton: 'reward-settings' }).lean()
    }
  }
  return doc
}

rewardSettingsSchema.statics.setEnabled = async function setEnabled(value) {
  const enabled = Boolean(value)
  const doc = await this.findOneAndUpdate(
    { singleton: 'reward-settings' },
    { $set: { rewardSystemEnabled: enabled } },
    { new: true, upsert: true }
  )
  return doc.toObject()
}

export default mongoose.model('RewardSettings', rewardSettingsSchema)