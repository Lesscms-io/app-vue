/**
 * LessCMS Universal Frontend
 *
 * A plug-and-play frontend that renders any LessCMS project.
 *
 * Configuration:
 * 1. Copy .env.example to .env
 * 2. Fill in your API credentials
 * 3. Run: npm run engine
 */

import { createApp } from 'vue'
import App from './App.vue'
import { createRouter } from './router'

// Base styles (CSS variables & widget styles)
import '../src/styles/variables.css'
import '../src/styles/widgets.css'

// Custom styles (add your overrides here)
import './custom.css'

const app = createApp(App)
const router = createRouter()

app.use(router)
app.mount('#app')
