// Loads server/.env BEFORE any module that reads process.env (ESM imports hoist,
// so this must be the first import in the entry file).
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })