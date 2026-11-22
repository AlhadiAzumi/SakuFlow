import assert from 'node:assert/strict'
import test from 'node:test'
import { extractText, isBlockedKey, isFresh } from '../src/baileys.js'

test('baca teks dari pesan biasa', () => {
  assert.equal(extractText({ conversation: 'keluar 25rb buat kopi' }), 'keluar 25rb buat kopi')
  assert.equal(extractText({ extendedTextMessage: { text: 'gaji 3 juta' } }), 'gaji 3 juta')
})

test('buka bungkusan deviceSentMessage, ephemeralMessage, dan viewOnceMessage', () => {
  const text = 'masuk uang 500 ribu'

  assert.equal(extractText({ deviceSentMessage: { message: { conversation: text } } }), text)
  assert.equal(extractText({ ephemeralMessage: { message: { conversation: text } } }), text)
  assert.equal(extractText({ viewOnceMessage: { message: { extendedTextMessage: { text } } } }), text)
})

test('prioritaskan bungkusan paling luar bila beberapa lapisan ada', () => {
  const message = {
    conversation: 'pesan luar',
    deviceSentMessage: { message: { conversation: 'pesan dalam' } },
  }
  assert.equal(extractText(message), 'pesan dalam')
})

test('pesan tanpa teks diabaikan', () => {
  assert.equal(extractText({}), '')
  assert.equal(extractText(undefined), '')
})

test('filter waktu: pesan baru diterima, pesan lama ditolak', () => {
  const now = Date.now() / 1000

  assert.equal(isFresh({ messageTimestamp: now - 5 }), true)
  assert.equal(isFresh({ messageTimestamp: now - 59 }), true)
  assert.equal(isFresh({ messageTimestamp: now - 61 }), false)
  assert.equal(isFresh({ messageTimestamp: now - 3600 }), false)
})

test('pesan tanpa timestamp tetap diterima', () => {
  assert.equal(isFresh({}), true)
})

test('blokir grup, broadcast, newsletter, participant, dan JID kosong', () => {
  assert.equal(isBlockedKey({ remoteJid: '' }), true)
  assert.equal(isBlockedKey({ remoteJid: '120363012345678901@g.us' }), true)
  assert.equal(isBlockedKey({ remoteJid: 'status@broadcast' }), true)
  assert.equal(isBlockedKey({ remoteJid: '120363012345678901@newsletter' }), true)
  assert.equal(isBlockedKey({ remoteJid: '6285167811268@s.whatsapp.net', participant: '628999@s.whatsapp.net' }), true)
})

test('chat satu lawan satu tidak diblokir', () => {
  assert.equal(isBlockedKey({ remoteJid: '6285167811268@s.whatsapp.net' }), false)
  assert.equal(isBlockedKey({ remoteJid: '80501142515803@lid' }), false)
})
