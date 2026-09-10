import multer from 'multer'

const IMAGE_ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
const VIDEO_ALLOWED = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (IMAGE_ALLOWED.includes(file.mimetype)) return cb(null, true)
    const err = new Error('Only image files are allowed')
    err.statusCode = 400
    cb(err)
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (VIDEO_ALLOWED.includes(file.mimetype)) return cb(null, true)
    const err = new Error('Only video files are allowed (MP4, WebM, OGG, MOV)')
    err.statusCode = 400
    cb(err)
  },
  limits: { fileSize: 50 * 1024 * 1024 },
})