import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // needed for docker
    port: 5173,
    proxy: {
      '/api': 'http://backend:8000',
      '/auth': 'http://backend:8000',
    }
  }
})
