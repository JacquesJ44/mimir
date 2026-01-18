import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mimir/',
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.99.50:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})