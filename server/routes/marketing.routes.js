import { Router } from 'express'
import { trackReferralVisit } from '../controllers/marketing.controller.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

router.post('/track', optionalAuth, trackReferralVisit)

export default router