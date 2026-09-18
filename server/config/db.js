import mongoose from 'mongoose'
import { runRewardOrderIndexMigration } from './rewardMigrations.js'
import { runCategoryIndexMigration } from './categoryMigrations.js'
import { seedWilayas } from './wilayas.js'

export async function connectDB(uri) {
  if (!uri || uri.startsWith('your_')) {
    throw new Error(
      'MONGODB_URI is not configured. Copy server/.env.example to server/.env and set your MongoDB Atlas connection string.'
    )
  }

  mongoose.set('strictQuery', true)
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  })
  await runRewardOrderIndexMigration()
  await runCategoryIndexMigration()
  await seedWilayas()
  return conn
}