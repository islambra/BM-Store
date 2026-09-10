import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import {
  getPublishedPosts,
  getPublishedPostsHome,
  getPostById,
  likePost,
  unlikePost,
  listComments,
  createComment,
} from '../controllers/post.controller.js'

const router = Router()

router.get('/', optionalAuth, getPublishedPosts)
router.get('/home', optionalAuth, getPublishedPostsHome)
router.get('/:id/comments', listComments)
router.get('/:id', optionalAuth, getPostById)

router.post('/:id/like', requireAuth, likePost)
router.delete('/:id/like', requireAuth, unlikePost)
router.post('/:id/comments', requireAuth, createComment)

export default router