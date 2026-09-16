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

// The client-supplied mimetype is not trusted on its own: the file contents
// are verified against known signatures so arbitrary payloads cannot be stored
// and served back as images/videos. See the controller check before GridFS.
const IMAGE_SIGNATURE = [
  (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a, // PNG
  (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // JPEG
  (b) => b.length >= 6 && b.toString('ascii', 0, 4) === 'GIF8', // GIF87a / GIF89a
  (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP', // WebP
  (b) => b.length >= 16 && b.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('ascii', 8, Math.min(b.length, 32))), // AVIF
]

const VIDEO_SIGNATURE = [
  (b) => b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp', // MP4 / MOV / M4V
  (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3, // WebM (EBML)
  (b) => b.length >= 4 && b.toString('ascii', 0, 4) === 'OggS', // OGG
]

export const isValidImageBuffer = (buf) => Boolean(buf) && buf.length > 0 && IMAGE_SIGNATURE.some((check) => check(buf))
export const isValidVideoBuffer = (buf) => Boolean(buf) && buf.length >= 12 && VIDEO_SIGNATURE.some((check) => check(buf))