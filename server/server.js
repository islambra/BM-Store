import './config/bootstrap.js'
import { connectDB } from './config/db.js'
import app from './app.js'

const PORT = process.env.PORT || 5000

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI)
    console.log('MongoDB connected')
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('[Startup failed]', err.message)
    process.exit(1)
  }
}

start()