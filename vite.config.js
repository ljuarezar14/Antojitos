import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { databaseApi } from './database/api.js'

// Emits sw.js with the list of this build's files, so the app opens without signal.
function serviceWorker() {
  return {
    name: 'antojitos-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter(file => file !== 'index.html' && !file.endsWith('.map')).map(file => `/${file}`)
      const precache = ['/', '/logo.png', '/icon-192.png', '/manifest.webmanifest', ...files]
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)
      const source = readFileSync(new URL('./sw/service-worker.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), databaseApi(), serviceWorker()],
  server: {
    port: 3000,
    host: '127.0.0.1'
  }
})
