import { upload, isValidImageBuffer } from '../utils/upload.js'
import { saveFileToGridFS } from '../utils/gridfs.js'
import { sendSuccess, sendError } from '../utils/response.js'

export const uploadImage = [
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return sendError(res, 'No image file provided', 400)
    if (!isValidImageBuffer(req.file.buffer)) {
      return sendError(res, 'File content does not match an allowed image type', 400)
    }
    try {
      const id = await saveFileToGridFS({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
      })
      const url = `/uploads/${id}`
      return sendSuccess(res, { url }, 'Image uploaded', 201)
    } catch (err) {
      console.error('[Upload failed]', err.message)
      return sendError(res, 'Failed to store image', 500)
    }
  },
]