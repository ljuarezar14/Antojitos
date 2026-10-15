import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { databaseApi } from './database/api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), databaseApi()],
  server: {
    port: 3000,
    host: '127.0.0.1'
  }
})
