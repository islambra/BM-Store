import { Router } from 'express'
import { getBanners } from '../controllers/banner.controller.js'

const router = Router()

router.get('/', getBanners)

export default router