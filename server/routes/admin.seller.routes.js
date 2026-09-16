import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import {
  adminListSellers,
  adminGetSeller,
  adminDeleteSeller,
  adminListStoreRequests,
  adminGetStoreRequest,
  adminApproveStoreRequest,
  adminRejectStoreRequest,
  adminListStores,
  adminGetStore,
  adminSuspendStore,
  adminActivateStore,
  adminListSellerProducts,
  adminDeleteSellerProduct,
  adminDisableSellerProduct,
  adminEnableSellerProduct,
  adminListSellerOrders,
  adminUpdateSellerOrderStatus,
} from '../controllers/admin.seller.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireAdmin)

// Sellers
router.get('/sellers', adminListSellers)
router.get('/sellers/:id', adminGetSeller)
router.delete('/sellers/:id', adminDeleteSeller)

// Store Requests
router.get('/store-requests', adminListStoreRequests)
router.get('/store-requests/:id', adminGetStoreRequest)
router.post('/store-requests/:id/approve', adminApproveStoreRequest)
router.post('/store-requests/:id/reject', adminRejectStoreRequest)

// Stores
router.get('/stores', adminListStores)
router.get('/stores/:id', adminGetStore)
router.post('/stores/:id/suspend', adminSuspendStore)
router.post('/stores/:id/activate', adminActivateStore)

// Seller Products
router.get('/products', adminListSellerProducts)
router.delete('/products/:id', adminDeleteSellerProduct)
router.post('/products/:id/disable', adminDisableSellerProduct)
router.post('/products/:id/enable', adminEnableSellerProduct)

// Seller Orders
router.get('/orders', adminListSellerOrders)
router.patch('/orders/:id/status', adminUpdateSellerOrderStatus)

export default router