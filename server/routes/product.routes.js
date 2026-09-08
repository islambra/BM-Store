import { Router } from 'express'
import { getProducts, getProductById, getProductBySlug } from '../controllers/product.controller.js'

const router = Router()

router.get('/', getProducts)
router.get('/:id', getProductById)
router.get('/slug/:slug', getProductBySlug)

export default router
