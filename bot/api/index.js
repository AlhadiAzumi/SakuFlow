// Vercel Serverless Function: ekspor ulang Express app.
// Body webhook harus mentah supaya tanda tangan HMAC Meta bisa diverifikasi.
export const config = { api: { bodyParser: false } }

export { default } from '../src/server.js'
