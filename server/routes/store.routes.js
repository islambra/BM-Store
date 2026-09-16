import { Router } from 'express'
import { requireAuth, requireSeller } from '../middleware/auth.js'
import {
  getMyStore,
  updateMyStore,
  listMyProducts,
  getMyProduct,
  createMyProduct,
  updateMyProduct,
  deleteMyProduct,
  toggleMyProductStatus,
  listMyCategories,
  createMyCategory,
  updateMyCategory,
  deleteMyCategory,
  listMyOrders,
  getMyOrder,
  updateMyOrderStatus,
  deleteMyOrder,
  getMyEarnings,
  getMySubscription,
  submitRenewalRequest,
} from '../controllers/store.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireSeller)

// Store info
router.get('/', getMyStore)
router.patch('/', updateMyStore)

// Products
router.get('/products', listMyProducts)
router.get('/products/:id', getMyProduct)
router.post('/products', createMyProduct)
router.patch('/products/:id', updateMyProduct)
router.delete('/products/:id', deleteMyProduct)
router.patch('/products/:id/toggle', toggleMyProductStatus)

// Categories
router.get('/categories', listMyCategories)
router.post('/categories', createMyCategory)
router.patch('/categories/:id', updateMyCategory)
router.delete('/categories/:id', deleteMyCategory)

// Orders
router.get('/orders', listMyOrders)
router.get('/orders/:id', getMyOrder)
router.patch('/orders/:id/status', updateMyOrderStatus)
router.delete('/orders/:id', deleteMyOrder)

// Earnings
router.get('/earnings', getMyEarnings)

// Subscription
router.get('/subscription', getMySubscription)
router.post('/subscription/renew', submitRenewalRequest)

export default router