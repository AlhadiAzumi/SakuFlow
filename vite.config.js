import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_ROUTES = {
  '/privacy': '/privacy/',
  '/terms': '/terms/',
  '/promo': '/index.html',
  '/masuk': '/index.html',
  '/dashboard': '/index.html',
  '/catatan': '/index.html',
  '/setelan': '/index.html',
}

const rewriteAppRoutes = (req, _res, next) => {
  const [rawPath, query] = (req.url || '').split('?')
  const pathname = rawPath.replace(/\/+$/, '') || '/'
  const isSettingsPage = /^\/setelan\/[^/]+$/.test(pathname)
  const target = APP_ROUTES[pathname] || (isSettingsPage ? '/index.html' : null)
  if (target) req.url = query ? `${target}?${query}` : target
  next()
}

const appRoutesPlugin = () => ({
  name: 'app-routes',
  configureServer(server) {
    server.middlewares.use(rewriteAppRoutes)
  },
  configurePreviewServer(server) {
    server.middlewares.use(rewriteAppRoutes)
  },
})

export default defineConfig({
  plugins: [
    appRoutesPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['iconsakunode.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Sakunode | Catatan Uang Harian & Visualisasi Arus Kas',
        short_name: 'Sakunode',
        description: 'Catat keuangan harian dengan cepat lewat web dan bot WhatsApp, lalu lihat ke mana uangmu pergi.',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'iconsakunode.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/privacy/, /^\/terms/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
