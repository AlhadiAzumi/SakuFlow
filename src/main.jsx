import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import ScrollProgress from './components/ScrollProgress'
import { AppProvider } from './context/AppContext'
import './styles.css'

registerSW({ immediate: true })

const pathname = window.location.pathname.replace(/\/+$/, '')
const isPromo = pathname === '/promo'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      {!isPromo && <ScrollProgress />}
      <App />
    </AppProvider>
  </React.StrictMode>,
)
