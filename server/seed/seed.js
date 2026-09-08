// Development-only seed. Explicit, non-destructive (upserts only — never dropDatabase/deleteMany).
// Run: npm run seed
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import HeroBanner from '../models/HeroBanner.js'
import MarketerProfile from '../models/MarketerProfile.js'

const uri = process.env.MONGODB_URI

if (!uri || uri.startsWith('your_')) {
  console.error('MONGODB_URI is not configured.')
  process.exit(1)
}

const img = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

const categories = [
  { slug: 'spices', name: 'Spices', nameAr: 'بهارات', nameFr: 'Épices', image: img('photo-1596040033229-a9821ebd058d'), icon: 'spices', order: 1 },
  { slug: 'cosmetics', name: 'Cosmetics', nameAr: 'مستحضرات تجميل', nameFr: 'Cosmétiques', image: img('photo-1596462502278-27bfdc403348'), icon: 'cosmetics', order: 2 },
  { slug: 'baking', name: 'Baking Supplies', nameAr: 'مستلزمات الخبز', nameFr: 'Pâtisserie', image: img('photo-1509440159596-0249088772ff'), icon: 'baking', order: 3 },
  { slug: 'nuts', name: 'Nuts', nameAr: 'مكسرات', nameFr: 'Fruits à coque', image: img('photo-1508061253366-f7da158b6d46'), icon: 'nuts', order: 4 },
  { slug: 'legumes', name: 'Legumes', nameAr: 'بقوليات', nameFr: 'Légumineuses', image: img('photo-1556911220-bff31c812dba'), icon: 'legumes', order: 5 },
  { slug: 'natural-mixes', name: 'Natural Mixes', nameAr: 'خلطات طبيعية', nameFr: 'Mélanges naturels', image: img('photo-1519861531473-9200262188bf'), icon: 'natural', order: 6 },
  { slug: 'dried-fruits', name: 'Dried Fruits', nameAr: 'فواكه مجففة', nameFr: 'Fruits secs', image: img('photo-1589740131973-3cd9037a958e'), icon: 'dried', order: 7 },
  { slug: 'oils-honey', name: 'Oils & Honey', nameAr: 'زيوت وعسل', nameFr: 'Huiles & Miel', image: img('photo-1474979266404-7eaacbcd87c5'), icon: 'oilsHoney', order: 8 },
]

// Normal products come first: until real orders arrive, the best-selling fallback
// ordering (createdAt asc) surfaces these four clean, discount-free products.
const products = [
  { slug: 'saffron-threads-1g', name: 'Saffron Threads 1g', nameAr: 'زعفران خيطي', nameFr: 'Filaments de safran', price: 5400, category: 'spices', categoryName: 'Spices', image: img('photo-1596040033229-a9821ebd058d'), stock: 25, isActive: true, isFeatured: true, isRewardEligible: false },
  { slug: 'dates-medjool-1kg', name: 'Dates Medjool 1kg', nameAr: 'تمر مجهول', nameFr: 'Dattes Medjool', price: 1900, category: 'dried-fruits', categoryName: 'Dried Fruits', image: img('photo-1589740131973-3cd9037a958e'), stock: 50, isActive: true, isFeatured: true, isRewardEligible: true },
  { slug: 'brown-lentils-500g', name: 'Brown Lentils 500g', nameAr: 'عدس بني', nameFr: 'Lentilles brunes', price: 650, category: 'legumes', categoryName: 'Legumes', image: img('photo-1556911220-bff31c812dba'), stock: 100, isActive: true, isFeatured: false, isRewardEligible: false },
  { slug: 'premium-flour-1kg', name: 'Premium Flour 1kg', nameAr: 'دقيق فاخر', nameFr: 'Farine premium', price: 480, category: 'baking', categoryName: 'Baking Supplies', image: img('photo-1509440159596-0249088772ff'), stock: 90, isActive: true, isFeatured: false, isRewardEligible: false },
  { slug: 'wildflower-honey-500ml', name: 'Wildflower Honey 500ml', nameAr: 'عسل الزهور البرية', nameFr: 'Miel de fleurs sauvages', price: 1750, oldPrice: 2350, category: 'oils-honey', categoryName: 'Oils & Honey', image: img('photo-1587049352846-4a222e784d38'), stock: 40, isActive: true, isFeatured: true, isRewardEligible: true },
  { slug: 'cold-pressed-argan-oil-100ml', name: 'Cold Pressed Argan Oil 100ml', nameAr: 'زيت الأرغان البكر', nameFr: "Huile d'argan pressée à froid", price: 2950, oldPrice: 3650, category: 'oils-honey', categoryName: 'Oils & Honey', image: img('photo-1556760544-74068565f05c'), stock: 12, isActive: true, isFeatured: true, isRewardEligible: true },
  { slug: 'roasted-almonds-500g', name: 'Roasted Almonds 500g', nameAr: 'لوز محمص', nameFr: 'Amandes grillées', price: 1350, oldPrice: 1700, category: 'nuts', categoryName: 'Nuts', image: img('photo-1508061253366-f7da158b6d46'), stock: 60, isActive: true, isFeatured: false, isRewardEligible: true },
  { slug: 'black-seed-honey-250g', name: 'Black Seed Honey 250g', nameAr: 'عسل حبة البركة', nameFr: 'Miel de nigelle', price: 1950, oldPrice: 2450, category: 'oils-honey', categoryName: 'Oils & Honey', image: img('photo-1589391886645-d51941baf7fb'), stock: 35, isActive: true, isFeatured: false, isRewardEligible: true },
  { slug: 'handmade-shea-soap', name: 'Handmade Shea Butter Soap', nameAr: 'صابون الشيا الطبيعي', nameFr: 'Savon artisanal au beurre de karité', price: 700, oldPrice: 900, category: 'natural-mixes', categoryName: 'Natural Mixes', image: img('photo-1556228720-195a672e8a03'), stock: 80, isActive: true, isFeatured: false, isRewardEligible: false },
  { slug: 'organic-olive-oil-750ml', name: 'Organic Olive Oil 750ml', nameAr: 'زيت زيتون عضوي', nameFr: "Huile d'olive biologique", price: 2600, oldPrice: 3200, category: 'oils-honey', categoryName: 'Oils & Honey', image: img('photo-1474979266404-7eaacbcd87c5'), stock: 28, isActive: true, isFeatured: true, isRewardEligible: true },
  { slug: 'rose-water-facial-mist-120ml', name: 'Rose Water Facial Mist 120ml', nameAr: 'ماء الورد للوجه', nameFr: 'Eau de rose pour le visage', price: 1250, oldPrice: 1650, category: 'cosmetics', categoryName: 'Cosmetics', image: img('photo-1607857544383-bde3da568b70'), stock: 45, isActive: true, isFeatured: false, isRewardEligible: false },
  { slug: 'dried-apricots-400g', name: 'Dried Apricots 400g', nameAr: 'مشمش مجفف', nameFr: 'Abricots secs', price: 1200, oldPrice: 1500, category: 'dried-fruits', categoryName: 'Dried Fruits', image: img('photo-1549007953-2f2dc0b24019'), stock: 55, isActive: true, isFeatured: false, isRewardEligible: true },
]

const banners = [
  {
    image: img('photo-1504674900247-0877df9cc836', 1800), link: '/categories',
    badgeEn: 'New Season', titleEn: 'Fresh & Natural', subtitleEn: 'Natural products from trusted producers, delivered to your door.', ctaEn: 'Shop Now',
    badgeFr: 'Nouvelle saison', titleFr: 'Frais & Naturel', subtitleFr: 'Produits naturels de producteurs de confiance, livrés chez vous.', ctaFr: 'Acheter maintenant',
    badgeAr: 'موسم جديد', titleAr: 'طازج وطبيعي', subtitleAr: 'منتجات طبيعية من منتجين موثوقين، تصلك حتى باب منزلك.', ctaAr: 'تسوق الآن',
    active: true, order: 1,
  },
  {
    image: img('photo-1596040033229-a9821ebd058d', 1800), link: '/category/spices',
    badgeEn: 'Best Sellers', titleEn: 'Premium Spices', subtitleEn: 'Saffron, single-origin spices and aromatic herbs.', ctaEn: 'Discover Spices',
    badgeFr: 'Meilleures ventes', titleFr: 'Épices Premium', subtitleFr: 'Safran, épices et herbes aromatiques d\'exception.', ctaFr: 'Découvrir les épices',
    badgeAr: 'الأكثر مبيعاً', titleAr: 'بهارات فاخرة', subtitleAr: 'زعفران وبهارات من مصدر واحد وأعشاب عطرية.', ctaAr: 'اكتشف البهارات',
    active: true, order: 2,
  },
  {
    image: img('photo-1587049352846-4a222e784d38', 1800), link: '/category/oils-honey',
    badgeEn: 'From the Mountains', titleEn: 'Pure Honey & Oils', subtitleEn: 'Raw honey and cold pressed oils from remote producers.' , ctaEn: 'Explore',
    badgeFr: 'De nos montagnes', titleFr: 'Miels & Huiles purs', subtitleFr: 'Miels bruts et huiles pressées à froid.', ctaFr: 'Explorer',
    badgeAr: 'من الجبال', titleAr: 'عسل وزيت نقي', subtitleAr: 'عسل خام وزيوت معصورة على البارد.', ctaAr: 'استكشف',
    active: true, order: 3,
  },
]

async function upsertUser(email, data) {
  const passwordHash = await bcrypt.hash(data.password, 10)
  await User.updateOne(
    { email },
    { $set: { ...data, passwordHash } },
    { upsert: true }
  )
  return User.findOne({ email })
}

async function seed() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 120000 })
  console.log('Connected.')

  await upsertUser('admin@bmstore.dz', {
    name: 'BM Store Admin',
    password: 'Admin@123456',
    role: 'ADMIN',
  })

  const marketers = [
    { email: 'marketer1@bmstore.dz', name: 'Karim Benali', password: 'Marketer@123456', code: 'MARKETER1' },
    { email: 'marketer2@bmstore.dz', name: 'Yasmine Haddad', password: 'Marketer@123456', code: 'MARKETER2' },
    { email: 'marketer3@bmstore.dz', name: 'Amine Cherif', password: 'Marketer@123456', code: 'MARKETER3' },
  ]
  const marketerDocs = []
  for (const m of marketers) {
    const user = await upsertUser(m.email, {
      name: m.name,
      password: m.password,
      role: 'MARKETER',
      phone: '0550 12 34 56',
    })
    marketerDocs.push({ user, code: m.code })
  }

  await upsertUser('user@bmstore.dz', {
    name: 'Lina Merabet',
    password: 'User@123456',
    role: 'USER',
    phone: '0660 12 34 56',
  })

  for (const c of categories) {
    await Category.updateOne({ slug: c.slug }, { $set: c }, { upsert: true })
  }

  for (const p of products) {
    await Product.updateOne(
      { slug: p.slug },
      {
        $set: {
          ...p,
          isSpecialOffer: Boolean(p.oldPrice),
          confirmedSales: 0,
          discount: 0,
          images: [p.image],
          thumbnail: p.image,
          tags: ['premium'],
          lowStockThreshold: 5,
        },
        $unset: { rating: '', reviewCount: '' },
      },
      { upsert: true }
    )
  }

  for (const b of banners) {
    await HeroBanner.updateOne(
      { titleEn: b.titleEn },
      { $set: b },
      { upsert: true }
    )
  }

  for (const { user, code } of marketerDocs) {
    await MarketerProfile.updateOne(
      { user: user._id },
      {
        $set: {
          publicName: user.name,
          bio: 'Promoting authentic regional products on BM Store.',
          referralCode: code,
          status: 'active',
          payoutDetails: { ccp: 'CP 1234567', baridiMob: '0770 12 34 56' },
        },
      },
      { upsert: true }
    )
  }

  console.log('Seed complete.')
  console.log('Admin   : admin@bmstore.dz / Admin@123456')
  console.log('Marketer: marketer1@bmstore.dz (Marketer@123456), marketer2@bmstore.dz')
  console.log('User    : user@bmstore.dz / User@123456')
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('[Seed failed]', err.message)
  process.exit(1)
})
