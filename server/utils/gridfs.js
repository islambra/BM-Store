import mongoose from 'mongoose'

const BUCKET = 'uploads'

function db() {
  return mongoose.connection.db
}

export function getBucket(bucketName = BUCKET) {
  return new mongoose.mongo.GridFSBucket(db(), { bucketName })
}

export function saveFileToGridFS({ buffer, mimetype, originalname }) {
  return new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(originalname || 'image', {
      contentType: mimetype,
      metadata: {
        originalname: originalname || '',
        uploadDate: new Date(),
      },
    })
    stream.end(buffer)
    stream.on('error', reject)
    stream.on('finish', () => resolve(stream.id))
  })
}

export async function findGridFSFile(_id) {
  return getBucket().find({ _id }).next()
}