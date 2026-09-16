import { Router } from 'express'
import { requireAuth, requireSeller } from '../middleware/auth.js'
import { limitAuth } from '../config/rateLimit.js'
import {
  registerSeller,
  loginSeller,
  logoutSeller,
  refreshSeller,
  getSellerMe,
  updateSellerMe,
  changeSellerPassword,
  submitStoreRequest,
  getMyStoreRequest,
  checkSlugAvailability,
} from '../controllers/seller.controller.js'

const router = Router()

// Public auth routes
router.post('/register', limitAuth, registerSeller)
router.post('/login', limitAuth, loginSeller)
router.post('/logout', logoutSeller)
router.post('/refresh', refreshSeller)

// Protected routes
router.use(requireAuth)
router.use(requireSeller)

router.get('/me', getSellerMe)
router.patch('/me', updateSellerMe)
router.patch('/password', changeSellerPassword)

// Store Request
router.post('/store-request', submitStoreRequest)
router.get('/store-request', getMyStoreRequest)
router.get('/check-slug', checkSlugAvailability)

export default router