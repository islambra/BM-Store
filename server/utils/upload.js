import multer from 'multer'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true)
    const err = new Error('Only image files are allowed')
    err.statusCode = 400
    cb(err)
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})