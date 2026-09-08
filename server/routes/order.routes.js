import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { createOrder, getMyOrders } from '../controllers/order.controller.js'

const router = Router()

router.post('/', optionalAuth, createOrder)
router.get('/me', requireAuth, getMyOrders)

export default router
