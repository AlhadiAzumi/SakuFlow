import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { config } from '../src/config.js'
import { messageStore, sentMessageIds, sendText, setBaileysSocket } from '../src/whatsapp.js'

const originalBotMode = config.botMode
const originalDryRun = config.dryRun

after(() => {
  config.botMode = originalBotMode
  config.dryRun = originalDryRun
})

function fakeSocket(sent) {
  setBaileysSocket({
    sendMessage: async (jid, payload) => {
      sent.push({ jid, payload })
      return { key: { id: `reply-${sent.length}` }, message: { conversation: payload.text } }
    },
  })
}

test('balasan self-chat dikirim ke JID asli (@lid) dan disimpan untuk retry', async () => {
  config.botMode = 'baileys'
  config.dryRun = false
  const sent = []
  fakeSocket(sent)

  await sendText('80501142515803@lid', 'struk')

  assert.equal(sent.length, 1)
  assert.equal(sent[0].jid, '80501142515803@lid')
  assert.equal(messageStore.get('reply-1')?.message?.conversation, 'struk')
  assert.ok(sentMessageIds.has('reply-1'))
})

test('nomor HP biasa tetap dikirim ke JID @s.whatsapp.net', async () => {
  config.botMode = 'baileys'
  config.dryRun = false
  const sent = []
  fakeSocket(sent)

  await sendText('081234567890', 'struk')

  assert.equal(sent[0].jid, '6281234567890@s.whatsapp.net')
  assert.equal(messageStore.get('reply-1')?.message?.conversation, 'struk')
})
