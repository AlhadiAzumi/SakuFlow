import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { config } from '../src/config.js'
import { handleMessage } from '../src/handler.js'

const originalDryRun = config.dryRun
after(() => { config.dryRun = originalDryRun })

async function collectReply(text) {
  config.dryRun = true
  const replies = []
  await handleMessage(
    { id: `test-${text}`, from: '6281234567890', text: { body: text } },
    { send: async (_to, body) => { replies.push(body); return { dry: true } } },
  )
  return replies.join('\n')
}

test('sapaan dibalas panduan singkat', async () => {
  for (const text of ['halo', 'menu', 'hai']) {
    const reply = await collectReply(text)
    assert.match(reply, /Bot SakuFlow aktif/)
    assert.match(reply, /Hubungkan akun/)
    assert.match(reply, /Format catatan/)
  }
})

test('pesan yang tidak dikenal tetap dibalas panduan', async () => {
  const reply = await collectReply('blablabla')
  assert.match(reply, /Bot SakuFlow aktif/)
  assert.match(reply, /Format catatan/)
})
