import { Router } from 'express'
import {
  listPublicStores,
  getPublicStore,
  searchCategoriesAcrossStores,
  getStoreCategories,
  checkStoreSubscription,
} from '../controllers/public.store.controller.js'

const router = Router()

// Public stores listing
router.get('/', listPublicStores)

// Category search across stores
router.get('/categories/search', searchCategoriesAcrossStores)

// Individual store
router.get('/:slug', getPublicStore)
router.get('/:slug/categories', getStoreCategories)
router.get('/:slug/subscription', checkStoreSubscription)

export default router