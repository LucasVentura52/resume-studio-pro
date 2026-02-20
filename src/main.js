import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router, { warmupRouteChunks } from './router'
import 'vuetify/styles'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/sora/latin-700.css'
import '@fontsource/sora/latin-800.css'
import './style.css'

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')

router.isReady().then(() => {
  warmupRouteChunks()
})

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Falha ao registrar service worker:', error)
    })
  })
}
