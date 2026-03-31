import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readBackendPort() {
  const envFile = resolve(__dirname, '../backend/.env')
  if (!existsSync(envFile)) return 3001
  const match = readFileSync(envFile, 'utf8').match(/^PORT=(\d+)/m)
  return match ? parseInt(match[1]) : 3001
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${readBackendPort()}`,
        changeOrigin: true
      }
    }
  }
})
