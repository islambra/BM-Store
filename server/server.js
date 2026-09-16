import './config/bootstrap.js'
import { connectDB } from './config/db.js'
import app from './app.js'
import { runStoreLifecycle } from './services/storeLifecycle.js'

const PORT = process.env.PORT || 5000

// How often the subscription lifecycle sweeper runs (1 hour). It marks stores
// with an expired subscription as 'expired' and soft-deletes ('deleted') the
// ones left unpaid for the grace period.
const LIFECYCLE_INTERVAL_MS = 60 * 60 * 1000

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI)
    console.log('MongoDB connected')
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
    await runStoreLifecycle().catch((err) => console.error('[Store lifecycle]', err.message))
    setInterval(() => {
      void runStoreLifecycle().catch((err) => console.error('[Store lifecycle]', err.message))
    }, LIFECYCLE_INTERVAL_MS)
  } catch (err) {
    console.error('[Startup failed]', err.message)
    process.exit(1)
  }
}

start()