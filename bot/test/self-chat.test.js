import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractCleanId,
  getBotIdentity,
  isSelfChatFromKey,
  resolveSenderPhone,
} from '../src/self-chat.js'

test('ekstrak ID bersih dari device suffix dan domain', () => {
  assert.equal(extractCleanId('6285167811268:14@s.whatsapp.net'), '6285167811268')
  assert.equal(extractCleanId('80501142515803:14@lid'), '80501142515803')
  assert.equal(extractCleanId('6285167811268@s.whatsapp.net'), '6285167811268')
  assert.equal(extractCleanId(''), '')
})

test('identitas bot: nomor HP dari user.id dan LID dari user.lid', () => {
  assert.deepEqual(
    getBotIdentity({ id: '6285167811268:14@s.whatsapp.net', lid: '80501142515803:14@lid' }),
    { ownPhone: '6285167811268', ownLid: '80501142515803' },
  )
})

test('identitas bot: user.id berupa LID tidak dianggap nomor HP', () => {
  assert.deepEqual(
    getBotIdentity({ id: '80501142515803:14@lid' }),
    { ownPhone: '', ownLid: '80501142515803' },
  )
})

test('self-chat terdeteksi lewat PN maupun LID (remoteJid / remoteJidAlt)', () => {
  const identity = getBotIdentity({
    id: '6285167811268:14@s.whatsapp.net',
    lid: '80501142515803:14@lid',
  })

  assert.equal(isSelfChatFromKey({ remoteJid: '6285167811268@s.whatsapp.net' }, identity), true)
  assert.equal(isSelfChatFromKey({ remoteJid: '6285167811268:14@s.whatsapp.net' }, identity), true)
  assert.equal(isSelfChatFromKey({ remoteJid: '80501142515803@lid' }, identity), true)
  assert.equal(isSelfChatFromKey({ remoteJidAlt: '80501142515803:14@lid' }, identity), true)
})

test('self-chat ditolak untuk kontak lain, grup, dan status', () => {
  const identity = getBotIdentity({
    id: '6285167811268:14@s.whatsapp.net',
    lid: '80501142515803:14@lid',
  })

  assert.equal(isSelfChatFromKey({ remoteJid: '6289999999999@s.whatsapp.net' }, identity), false)
  assert.equal(isSelfChatFromKey({ remoteJid: '120363012345678901@g.us' }, identity), false)
  assert.equal(isSelfChatFromKey({ remoteJid: 'status@broadcast' }, identity), false)
})

test('self-chat dipetakan ke nomor HP asli, bukan angka LID', () => {
  const identity = getBotIdentity({
    id: '6285167811268:14@s.whatsapp.net',
    lid: '80501142515803:14@lid',
  })

  const key = { remoteJid: '80501142515803@lid', remoteJidAlt: '6285167811268@s.whatsapp.net' }
  assert.equal(resolveSenderPhone(key, identity, true), '6285167811268')

  // Pesan masuk biasa tetap memakai nomor pengirim aslinya.
  const otherKey = { remoteJid: '081234567890@s.whatsapp.net' }
  assert.equal(resolveSenderPhone(otherKey, identity, false), '6281234567890')
})
