import { config } from './config.js'

export async function sendText(to, body) {
  if (config.dryRun || !config.whatsappToken || !config.phoneNumberId) {
    console.log(`\n[DRY-RUN WA → ${to}]\n${body}\n`)
    return { dry: true }
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        text: { body },
      }),
    },
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gagal kirim WA: ${payload?.error?.message || response.status}`)
  }
  return payload
}
