import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uploadImage } from '../controllers/upload.controller.js'

const router = Router()

router.post('/', requireAuth, requireRole('ADMIN'), uploadImage)

export default router