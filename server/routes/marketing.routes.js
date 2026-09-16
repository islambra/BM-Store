import { Router } from 'express'
import { trackReferralVisit } from '../controllers/marketing.controller.js'
import { optionalAuth } from '../middleware/auth.js'
import { limitTracking } from '../config/rateLimit.js'

const router = Router()

router.post('/track', limitTracking, optionalAuth, trackReferralVisit)

export default router