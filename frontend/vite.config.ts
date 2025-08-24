// // vite.config.ts (or vite.config.js)
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       // Flask dev server (adjust port if yours isn't 5000)
//       '/insights': { target: 'http://localhost:5000', changeOrigin: true },
//       '/api':      { target: 'http://localhost:5000', changeOrigin: true },
//     },
//   },
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // New zoom/filters/data-preview endpoints
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      // Existing blueprint routes
      '/insights': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      // optional: health check
      '/health': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
