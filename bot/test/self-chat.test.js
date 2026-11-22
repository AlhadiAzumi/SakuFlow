import assert from 'node:assert/strict'
import test from 'node:test'
import { getSelfIdentifiers, isSelfChatTarget } from '../src/self-chat.js'

test('identitas diri dari user.id dengan suffix device', () => {
  const ids = getSelfIdentifiers({ id: '6281234567890:12@s.whatsapp.net' })
  assert.ok(ids.has('6281234567890'))
  assert.ok(ids.has('6281234567890@s.whatsapp.net'))
})

test('identitas diri dari user.id tanpa suffix', () => {
  const ids = getSelfIdentifiers({ id: '6281234567890@s.whatsapp.net' })
  assert.ok(ids.has('6281234567890'))
  assert.ok(ids.has('6281234567890@s.whatsapp.net'))
})

test('identitas diri dari user.lid', () => {
  const ids = getSelfIdentifiers({ id: '6281234567890:12@s.whatsapp.net', lid: '123456789' })
  assert.ok(ids.has('123456789'))
  assert.ok(ids.has('123456789@lid'))
})

test('target self-chat diterima untuk PN, device suffix, dan LID', () => {
  const ids = getSelfIdentifiers({ id: '6281234567890:12@s.whatsapp.net', lid: '123456789@lid' })
  assert.equal(isSelfChatTarget('6281234567890@s.whatsapp.net', ids), true)
  assert.equal(isSelfChatTarget('6281234567890:12@s.whatsapp.net', ids), true)
  assert.equal(isSelfChatTarget('123456789@lid', ids), true)
  assert.equal(isSelfChatTarget('123456789:5@lid', ids), true)
})

test('target selain diri sendiri ditolak (kontak lain / grup / status)', () => {
  const ids = getSelfIdentifiers({ id: '6281234567890:12@s.whatsapp.net', lid: '123456789' })
  assert.equal(isSelfChatTarget('6289999999999@s.whatsapp.net', ids), false)
  assert.equal(isSelfChatTarget('120363012345678901@g.us', ids), false)
  assert.equal(isSelfChatTarget('status@broadcast', ids), false)
  assert.equal(isSelfChatTarget(null, ids), false)
})
