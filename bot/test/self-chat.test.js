import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addSelfId,
  extractCleanId,
  getOwnPhone,
  isSelfChatKey,
  knownSelfIds,
  seedSelfIds,
} from '../src/self-chat.js'

function reset() {
  knownSelfIds.clear()
  seedSelfIds({ user: { id: '6285167811268:14@s.whatsapp.net', lid: '80501142515803:14@lid' } })
}

test('ekstrak ID bersih dari device suffix dan domain', () => {
  assert.equal(extractCleanId('6285167811268:14@s.whatsapp.net'), '6285167811268')
  assert.equal(extractCleanId('80501142515803:14@lid'), '80501142515803')
  assert.equal(extractCleanId('6285167811268@s.whatsapp.net'), '6285167811268')
  assert.equal(extractCleanId(''), '')
})

test('whitelist terisi dari sock.user dan state.creds.me', () => {
  reset()
  assert.equal(getOwnPhone(), '6285167811268')
  assert.ok(knownSelfIds.has('6285167811268'))
  assert.ok(knownSelfIds.has('80501142515803'))

  seedSelfIds({ user: {}, creds: { me: { id: '6289999999999:2@s.whatsapp.net', lid: '777@lid' } } })
  assert.ok(knownSelfIds.has('6289999999999'))
  assert.ok(knownSelfIds.has('777'))
})

test('nomor HP diambil dari creds.me bila user.id berupa LID', () => {
  knownSelfIds.clear()
  seedSelfIds({
    user: { id: '80501142515803:14@lid' },
    creds: { me: { id: '6285167811268:14@s.whatsapp.net' } },
  })
  assert.equal(getOwnPhone(), '6285167811268')
})

test('self-chat terdeteksi lewat PN maupun LID (remoteJid / remoteJidAlt)', () => {
  reset()
  assert.equal(isSelfChatKey({ remoteJid: '6285167811268@s.whatsapp.net' }), true)
  assert.equal(isSelfChatKey({ remoteJid: '6285167811268:14@s.whatsapp.net' }), true)
  assert.equal(isSelfChatKey({ remoteJid: '80501142515803@lid' }), true)
  assert.equal(isSelfChatKey({ remoteJidAlt: '80501142515803:14@lid' }), true)
})

test('nomor orang lain, grup, dan status ditolak', () => {
  reset()
  assert.equal(isSelfChatKey({ remoteJid: '6289999999999@s.whatsapp.net' }), false)
  assert.equal(isSelfChatKey({ remoteJid: '120363012345678901@g.us' }), false)
  assert.equal(isSelfChatKey({ remoteJid: 'status@broadcast' }), false)
  assert.equal(isSelfChatKey({}), false)
})

test('JID @lid hasil kirim bisa ditambahkan ke whitelist', () => {
  reset()
  assert.equal(isSelfChatKey({ remoteJid: '99887766554433@lid' }), false)
  addSelfId('99887766554433:9@lid')
  assert.equal(isSelfChatKey({ remoteJid: '99887766554433@lid' }), true)
})
