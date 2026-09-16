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

export async function deleteFileFromGridFS(_id) {
  try {
    await getBucket().delete(_id)
  } catch {
    // File may not exist or already deleted — swallow silently
  }
}

// Cleans up a GridFS-backed image if `url` is a stored /uploads/:id reference.
// External URLs and static files are left untouched.
export async function deleteGridFSByUrl(url) {
  if (typeof url !== 'string') return
  const m = url.match(/^\/uploads\/([0-9a-fA-F]{24})$/)
  if (m) await deleteFileFromGridFS(m[1])
}