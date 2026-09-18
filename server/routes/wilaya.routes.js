import { Router } from 'express'
import { getWilayas } from '../controllers/wilaya.controller.js'

const router = Router()

router.get('/', getWilayas)

export default router
