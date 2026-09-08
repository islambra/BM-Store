import { Router } from 'express'
import { requireAuth, requireMarketer } from '../middleware/auth.js'
import { getMarketerProfile, updateMarketerProfile, getMarketerEarnings } from '../controllers/marketer.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireMarketer)

router.get('/me', getMarketerProfile)
router.patch('/me', updateMarketerProfile)
router.get('/earnings', getMarketerEarnings)

export default router
