import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uploadImage } from '../controllers/upload.controller.js'
import { uploadVideoFile } from '../controllers/video.controller.js'

const router = Router()

router.post('/', requireAuth, requireRole('ADMIN'), uploadImage)
router.post('/video', requireAuth, requireRole('ADMIN'), uploadVideoFile)

export default router