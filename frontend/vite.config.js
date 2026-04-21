import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files so the proxy target can follow VITE_API_BASE_URL.
  // Falls back to localhost:8000 when the variable is absent (pure local dev).
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.VITE_API_BASE_URL || 'http://localhost:8000'
  // WebSocket proxy target: convert http(s):// → ws(s)://
  const wsOrigin = backendOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // HTTP API — same target whether local or Azure
        '/api': { target: backendOrigin, changeOrigin: true },
        // Media files served by Django/WhiteNoise — must follow the same backend
        '/media': { target: backendOrigin, changeOrigin: true },
        // WebSocket — Vite upgrades the connection and forwards to the backend
        '/ws': { target: wsOrigin, ws: true, changeOrigin: true },
      },
    },
  }
})
