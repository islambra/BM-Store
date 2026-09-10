import { Router } from 'express'
import {
  getPublishedPosts,
  getPublishedPostsHome,
  getPostById,
} from '../controllers/post.controller.js'

const router = Router()

router.get('/', getPublishedPosts)
router.get('/home', getPublishedPostsHome)
router.get('/:id', getPostById)

export default router
