import { Router } from 'express'
import { trackReferralVisit } from '../controllers/marketing.controller.js'

const router = Router()

router.post('/track', trackReferralVisit)

export default router
