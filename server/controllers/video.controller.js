import { uploadVideo, isValidVideoBuffer } from '../utils/upload.js'
import { saveFileToGridFS } from '../utils/gridfs.js'
import { sendSuccess, sendError } from '../utils/response.js'

export const uploadVideoFile = [
  uploadVideo.single('video'),
  async (req, res) => {
    if (!req.file) return sendError(res, 'No video file provided', 400)
    if (!isValidVideoBuffer(req.file.buffer)) {
      return sendError(res, 'File content does not match an allowed video type', 400)
    }
    try {
      const id = await saveFileToGridFS({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
      })
      const url = `/uploads/${id}`
      return sendSuccess(res, { url }, 'Video uploaded', 201)
    } catch (err) {
      console.error('[Video upload failed]', err.message)
      return sendError(res, 'Failed to store video', 500)
    }
  },
]
