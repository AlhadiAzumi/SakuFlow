import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Selama ini .env tidak pernah dibaca — ini yang bikin mode selalu dry-run.
// Path di-resolve relatif ke file ini, jadi tetap bot/.env walau dijalankan dari folder lain.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const env = (key, fallback = '') => (process.env[key] || fallback).trim()
// Meta Cloud API adalah satu-satunya transport yang tersedia di folder bot/.
const botMode = 'meta'

export const config = {
  port: Number(env('PORT', '3001')),
  botMode,
  webOrigins: [...new Set([
    ...env('WEB_ORIGIN', 'http://localhost:5173').split(','),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].map((s) => s.trim()).filter(Boolean))],
  verifyToken: env('WHATSAPP_VERIFY_TOKEN'),
  appSecret: env('WHATSAPP_APP_SECRET'),
  whatsappToken: env('WHATSAPP_TOKEN'),
  phoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID'),
  apiVersion: env('WHATSAPP_API_VERSION', 'v25.0'),
  supabaseUrl: env('SUPABASE_URL'),
  serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  dryRun: env('BOT_DRY_RUN', 'false') === 'true',
  dryOtpCode: env('BOT_DRY_OTP_CODE'),
}
