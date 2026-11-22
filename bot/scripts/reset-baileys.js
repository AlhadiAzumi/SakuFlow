import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const authDir = fileURLToPath(new URL('../auth', import.meta.url))
await fs.rm(path.resolve(authDir), { recursive: true, force: true })

console.log('Sesi Baileys dihapus. Jalankan `npm start`, lalu scan QR lagi.')
