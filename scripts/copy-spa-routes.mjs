import { copyFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const dist = resolve('dist')
const source = join(dist, 'index.html')

// Vercel kadang tidak menerapkan rewrites bila deploy dilakukan dari folder
// dist. Salinan statis ini membuat route SPA tetap bisa dibuka langsung.
const routes = [
  'masuk',
  'dashboard',
  'catatan',
  'setelan',
  'setelan/profil',
  'setelan/budget',
  'setelan/whatsapp',
  'setelan/data',
  'promo',
]

for (const route of routes) {
  const dir = join(dist, route)
  await mkdir(dir, { recursive: true })
  await copyFile(source, join(dir, 'index.html'))
}

console.log(`Route SPA tersalin: ${routes.length}`)
