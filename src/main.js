import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

createApp(App).use(vuetify).use(router).mount('#app')
