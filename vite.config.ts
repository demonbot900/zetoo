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
  server: {
    // Option 1: Allow specific hosts or subdomains (wildcard supported)
    allowedHosts: [
      'localhost',
      '.lhr.life',
    ],
    // Option 2: Allow all hosts (less secure)
    // allowedHosts: 'all',
  },
})
