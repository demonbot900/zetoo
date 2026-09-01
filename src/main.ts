// SVG country flags for the language switcher — emoji flags do not render on
// Windows and cannot be sized. https://flagicons.lipis.dev/
import 'flag-icons/css/flag-icons.min.css'
import './assets/main.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'jsvectormap/dist/jsvectormap.css'
import 'flatpickr/dist/flatpickr.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'
import { applyAppearance } from './composables/useAppearance'
import { applyLocale } from './composables/useLocale'

// Paint the saved theme before the first render so there is no flash of the
// default palette.
applyAppearance()
applyLocale()

const app = createApp(App)

app.use(router)
app.use(VueApexCharts)

app.mount('#app')
