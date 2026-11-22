import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const authDir = fileURLToPath(new URL('../auth', import.meta.url))
await fs.rm(path.resolve(authDir), { recursive: true, force: true })

console.log('Sesi Baileys lokal dihapus.')
console.log('Sebelum scan ulang, putuskan dulu perangkat lama di HP:')
console.log('WhatsApp > Perangkat Tertaut > pilih SakuFlow Bot > Putuskan.')
console.log('Lalu jalankan `npm start` dan scan QR dengan nomor yang sama.')
