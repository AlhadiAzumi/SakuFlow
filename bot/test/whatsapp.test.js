import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { config } from '../src/config.js'
import { knownSelfIds, seedSelfIds } from '../src/self-chat.js'
import { messageStore, sentMessageIds, sendText, setBaileysSocket } from '../src/whatsapp.js'

const originalBotMode = config.botMode
const originalDryRun = config.dryRun

after(() => {
  config.botMode = originalBotMode
  config.dryRun = originalDryRun
})

function fakeSocket(sent, sentRemoteJid) {
  setBaileysSocket({
    sendMessage: async (jid, payload) => {
      sent.push({ jid, payload })
      return {
        key: { id: `reply-${sent.length}`, remoteJid: sentRemoteJid },
        message: { conversation: payload.text },
      }
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

test('OTP ke nomor utama menangkap JID @lid hasil kirim', async () => {
  knownSelfIds.clear()
  seedSelfIds({ user: { id: '6285167811268:14@s.whatsapp.net', lid: '80501142515803:14@lid' } })
  config.botMode = 'baileys'
  config.dryRun = false
  const sent = []
  fakeSocket(sent, '99887766554433@lid')

  await sendText('6285167811268', '123456')

  assert.ok(knownSelfIds.has('99887766554433'))
})

test('kirim ke nomor orang lain tidak menambah whitelist', async () => {
  knownSelfIds.clear()
  seedSelfIds({ user: { id: '6285167811268:14@s.whatsapp.net' } })
  config.botMode = 'baileys'
  config.dryRun = false
  const sent = []
  fakeSocket(sent, '6289999999999@s.whatsapp.net')

  await sendText('6289999999999', 'halo')

  assert.equal(knownSelfIds.has('6289999999999'), false)
})
