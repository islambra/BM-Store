import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import * as category from '../controllers/category.controller.js'
import * as banner from '../controllers/banner.controller.js'
import {
  getUsers,
  getMarketers,
  updateMarketerStatus,
  recordPayout,
  getPayouts,
  adminDeleteMarketer,
} from '../controllers/admin.controller.js'
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminToggleProduct,
} from '../controllers/product.controller.js'
import { listOrders, updateOrderStatus } from '../controllers/order.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/users', getUsers)

router.get('/marketers', getMarketers)
router.delete('/marketers/:id', adminDeleteMarketer)
router.patch('/marketers/:id/status', updateMarketerStatus)

router.get('/orders', listOrders)
router.patch('/orders/:id/status', updateOrderStatus)

router.get('/products', adminListProducts)
router.post('/products', adminCreateProduct)
router.patch('/products/:id', adminUpdateProduct)
router.delete('/products/:id', adminDeleteProduct)
router.patch('/products/:id/toggle', adminToggleProduct)

router.get('/categories', category.adminList)
router.post('/categories', category.adminCreate)
router.patch('/categories/:id', category.adminUpdate)
router.delete('/categories/:id', category.adminDelete)

router.get('/banners', banner.adminList)
router.post('/banners', banner.adminCreate)
router.patch('/banners/:id', banner.adminUpdate)
router.delete('/banners/:id', banner.adminDelete)

router.post('/payouts', recordPayout)
router.get('/payouts', getPayouts)

export default router
