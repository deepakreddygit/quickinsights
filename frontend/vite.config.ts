// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       // New zoom/filters/data-preview endpoints
//       '/api': {
//         target: 'http://127.0.0.1:5001',
//         changeOrigin: true,
//       },
//       // Existing blueprint routes
//       '/insights': {
//         target: 'http://127.0.0.1:5001',
//         changeOrigin: true,
//       },
//       '/upload': {
//         target: 'http://127.0.0.1:5001',
//         changeOrigin: true,
//       },
//       '/auth': {
//         target: 'http://127.0.0.1:5001',
//         changeOrigin: true,
//       },
//       // optional: health check
//       '/health': {
//         target: 'http://127.0.0.1:5001',
//         changeOrigin: true,
//       },
//     },
//   },
// })


// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const DEV_API = env.VITE_DEV_API || 'http://127.0.0.1:5001'

  const proxyRules = {
    '/api':      { target: DEV_API, changeOrigin: true },
    '/insights': { target: DEV_API, changeOrigin: true },
    '/upload':   { target: DEV_API, changeOrigin: true },
    '/auth':     { target: DEV_API, changeOrigin: true },
    '/health':   { target: DEV_API, changeOrigin: true },
  } as const

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: proxyRules,
    },
    // NOTE: no preview.proxy — preview doesn’t support proxy typing
    preview: {
      port: 4173,
      strictPort: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'axios', 'dayjs'],
    },
  }
})

