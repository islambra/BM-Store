import { Router } from 'express'
import { requireAuth, requireMarketer } from '../middleware/auth.js'
import {
  getMarketerProfile,
  updateMarketerProfile,
  getMarketerDashboard,
  getMarketerOrders,
  getMarketerEarnings,
  getMarketerPayouts,
  confirmPayoutReceived,
  reportPayoutNotReceived,
  deleteMarketerPayout,
} from '../controllers/marketer.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireMarketer)

router.get('/me', getMarketerProfile)
router.patch('/me', updateMarketerProfile)
router.get('/dashboard', getMarketerDashboard)
router.get('/orders', getMarketerOrders)
router.get('/earnings', getMarketerEarnings)
router.get('/payments', getMarketerPayouts)
router.post('/payments/:id/confirm-received', confirmPayoutReceived)
router.post('/payments/:id/report-not-received', reportPayoutNotReceived)
router.delete('/payments/:id', deleteMarketerPayout)

export default router