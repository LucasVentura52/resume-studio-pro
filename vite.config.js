import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('html2pdf.js') ||
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg')
          ) {
            return 'pdf-export'
          }

          if (id.includes('vuetify')) {
            return 'vuetify'
          }

          if (id.includes('vue-router')) {
            return 'router'
          }

          if (id.includes('/vue/')) {
            return 'vue-core'
          }
        },
      },
    },
  },
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify({ autoImport: true }),
  ],
})
