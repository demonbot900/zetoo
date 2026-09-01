import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // flag-icons ships ~540 small SVGs. Left to the default 4 kB inline limit
    // Vite base64s nearly all of them into the render-blocking stylesheet
    // (566 kB). Emitting them as files keeps the CSS small and lets the
    // browser fetch only the handful of flags actually on screen.
    assetsInlineLimit: (filePath: string) =>
      filePath.includes('flag-icons') ? false : undefined,
  },
  server: {
    // Option 1: Allow specific hosts or subdomains (wildcard supported)
    allowedHosts: [
      'localhost',
      '.lhr.life',
    ],
    // Option 2: Allow all hosts (less secure)
    // allowedHosts: 'all',

    // The API runs as a separate process; proxying keeps the browser on one
    // origin so no CORS handling is needed.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT ?? 3001}`,
        changeOrigin: true,
      },
    },
  },
})
