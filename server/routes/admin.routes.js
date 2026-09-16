import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import * as category from '../controllers/category.controller.js'
import * as banner from '../controllers/banner.controller.js'
import {
  getUsers,
  getMarketers,
  getMarketerDetail,
  getMarketerOrders,
  getMarketerCommissions,
  getMarketerReferrals,
  getMarketerPayouts,
  updateMarketerStatus,
  recordPayout,
  updatePayoutStatus,
  getPayouts,
  adminDeleteMarketer,
  adminDeleteUser,
} from '../controllers/admin.controller.js'
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminToggleProduct,
} from '../controllers/product.controller.js'
import { listOrders, updateOrderStatus, adminDeleteOrder } from '../controllers/order.controller.js'
import {
  adminListPosts,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminPublishPost,
} from '../controllers/post.controller.js'
import {
  adminGetRewards,
  adminUpdateSettings,
  adminUpdateCategoryReward,
} from '../controllers/reward.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/users', getUsers)
router.delete('/users/:id', adminDeleteUser)

router.get('/marketers', getMarketers)
router.get('/marketers/:id', getMarketerDetail)
router.get('/marketers/:id/orders', getMarketerOrders)
router.get('/marketers/:id/commissions', getMarketerCommissions)
router.get('/marketers/:id/referrals', getMarketerReferrals)
router.get('/marketers/:id/payouts', getMarketerPayouts)
router.delete('/marketers/:id', adminDeleteMarketer)
router.patch('/marketers/:id/status', updateMarketerStatus)

router.get('/orders', listOrders)
router.patch('/orders/:id/status', updateOrderStatus)
router.delete('/orders/:id', adminDeleteOrder)

router.get('/products', adminListProducts)
router.post('/products', adminCreateProduct)
router.patch('/products/:id', adminUpdateProduct)
router.delete('/products/:id', adminDeleteProduct)
router.patch('/products/:id/toggle', adminToggleProduct)

router.get('/categories', category.adminList)
router.post('/categories', category.adminCreate)
router.patch('/categories/:id', category.adminUpdate)
router.delete('/categories/:id', category.adminDelete)

router.get('/rewards', adminGetRewards)
router.patch('/rewards/settings', adminUpdateSettings)
router.patch('/rewards/categories/:id', adminUpdateCategoryReward)

router.get('/banners', banner.adminList)
router.post('/banners', banner.adminCreate)
router.patch('/banners/:id', banner.adminUpdate)
router.delete('/banners/:id', banner.adminDelete)

router.get('/posts', adminListPosts)
router.post('/posts', adminCreatePost)
router.patch('/posts/:id', adminUpdatePost)
router.delete('/posts/:id', adminDeletePost)
router.patch('/posts/:id/publish', adminPublishPost)

router.post('/payouts', recordPayout)
router.get('/payouts', getPayouts)
router.patch('/payouts/:id', updatePayoutStatus)

export default router
