import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { limitOrders } from '../config/rateLimit.js'
import { createOrder, getMyOrders, updateMyOrder, deleteMyOrder } from '../controllers/order.controller.js'

const router = Router()

router.post('/', requireAuth, limitOrders, createOrder)
router.get('/me', requireAuth, getMyOrders)
router.patch('/:id', requireAuth, updateMyOrder)
router.delete('/:id', requireAuth, deleteMyOrder)

export default router
