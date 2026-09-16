import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Seller stores run on dynamic subdomains (e.g. http://islam-store.localhost:5173).
    // Browsers resolve "*.localhost" to 127.0.0.1 (IPv4); bind all interfaces so
    // store subdomains are always reachable regardless of the hosts' IPv6 only bind.
    host: true,
    allowedHosts: ['.localhost', 'localhost'],
  },
})