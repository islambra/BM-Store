import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import {
  getPublishedPosts,
  getPublishedPostsHome,
  getPostById,
  adminListPosts,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminPublishPost,
} from '../controllers/post.controller.js'

const router = Router()

// Public
router.get('/', getPublishedPosts)
router.get('/home', getPublishedPostsHome)
router.get('/:id', getPostById)

export default router

export const adminPostRoutes = (() => {
  const r = Router()
  r.use(requireAuth)
  r.use(requireAdmin)
  r.get('/', adminListPosts)
  r.post('/', adminCreatePost)
  r.patch('/:id', adminUpdatePost)
  r.delete('/:id', adminDeletePost)
  r.patch('/:id/publish', adminPublishPost)
  return r
})()
