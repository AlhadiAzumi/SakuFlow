import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

// Script ini dijalankan di mesin yang sama dengan bot, jadi boleh membaca
// app secret untuk menandatangani pesan simulasi (tidak dikirim ke mana-mana).
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(here, '..', '.env'), quiet: true })

const [phone = '6281234567890', ...rest] = process.argv.slice(2)
const text = rest.join(' ').trim()
const base = (process.env.BOT_URL || 'http://localhost:3001').replace(/\/$/, '')

if (!text) {
  console.log('Contoh: npm run send -- 6281234567890 "masuk uang 500 ribu"')
  process.exit(0)
}

const id = `test_${Date.now()}`
const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'test_entry',
    changes: [{
      field: 'messages',
      value: {
        messages: [{ id, from: phone, text: { body: text } }],
      },
    }],
  }],
}

const body = JSON.stringify(payload)
const headers = { 'Content-Type': 'application/json' }
if (process.env.WHATSAPP_APP_SECRET) {
  headers['X-Hub-Signature-256'] = `sha256=${crypto
    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
    .update(body)
    .digest('hex')}`
}

const response = await fetch(`${base}/webhook`, { method: 'POST', headers, body })

console.log(JSON.stringify({ status: response.status, id, phone, text }, null, 2))
if (!response.ok) process.exitCode = 1
