import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { updateComment, deleteComment } from '../controllers/post.controller.js'

const router = Router()

router.put('/:commentId', requireAuth, updateComment)
router.delete('/:commentId', requireAuth, deleteComment)

export default router