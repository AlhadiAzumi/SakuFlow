import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const LEGAL_ROUTES = {
  '/privacy': '/privacy/',
  '/terms': '/terms/',
}

const rewriteLegalRoutes = (req, _res, next) => {
  const [pathname, query] = (req.url || '').split('?')
  const target = LEGAL_ROUTES[pathname]
  if (target) req.url = query ? `${target}?${query}` : target
  next()
}

const legalRoutesPlugin = () => ({
  name: 'legal-routes',
  configureServer(server) {
    server.middlewares.use(rewriteLegalRoutes)
  },
  configurePreviewServer(server) {
    server.middlewares.use(rewriteLegalRoutes)
  },
})

export default defineConfig({
  plugins: [
    legalRoutesPlugin(),
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
