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

const response = await fetch(`${base}/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

console.log(JSON.stringify({ status: response.status, id, phone, text }, null, 2))
if (!response.ok) process.exitCode = 1
