import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Porta 8001: 8000 costuma estar ocupada (Docker/WSL/outras apps)
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
