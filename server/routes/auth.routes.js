import { Router } from 'express'
import { register, login, logout, refresh, me, updateMe, changePassword, becomeMarketer, registerMarketer } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { limitAuth } from '../config/rateLimit.js'

const router = Router()

router.post('/register', limitAuth, register)
router.post('/register-marketer', limitAuth, registerMarketer)
router.post('/login', limitAuth, login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, updateMe)
router.patch('/password', requireAuth, changePassword)
router.post('/become-marketer', requireAuth, becomeMarketer)

export default router
