import mongoose from 'mongoose'

export const MAX_ACTIVE_BANNERS = 5

const heroBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    link: { type: String, default: '/categories' },
    badgeEn: String,
    titleEn: String,
    subtitleEn: String,
    ctaEn: String,
    badgeFr: String,
    titleFr: String,
    subtitleFr: String,
    ctaFr: String,
    badgeAr: String,
    titleAr: { type: String },
    subtitleAr: String,
    ctaAr: String,
    active: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

heroBannerSchema.index({ active: 1, order: 1 })

export default mongoose.model('HeroBanner', heroBannerSchema)