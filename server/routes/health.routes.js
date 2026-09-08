import { Router } from 'express'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/health', (_req, res) =>
  sendSuccess(res, { uptime: process.uptime(), timestamp: new Date().toISOString() }, 'Server is running')
)

export default router