import { Router } from 'express'
import { getPublicRewards } from '../controllers/reward.controller.js'

const router = Router()

// Public reward overview used only for display estimates.
router.get('/', getPublicRewards)

export default router