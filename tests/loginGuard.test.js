import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearLoginFailures,
  formatWait,
  getLoginLock,
  isCredentialError,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  recordFailedLogin,
} from '../src/lib/loginGuard.js'

const START = 1_700_000_000_000

const createStorage = () => {
  const entries = new Map()
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  }
}

test('tujuh percobaan gagal mengunci email selama 30 menit', () => {
  const storage = createStorage()
  for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i += 1) {
    recordFailedLogin('User@Example.com', START + i * 1000, storage)
  }

  const before = getLoginLock('user@example.com', START + 6000, storage)
  assert.equal(before.locked, false)
  assert.equal(before.count, LOGIN_MAX_ATTEMPTS - 1)
  assert.equal(before.attemptsLeft, 1)

  const after = recordFailedLogin('user@example.com', START + 7000, storage)
  assert.equal(after.locked, true)
  assert.equal(after.count, LOGIN_MAX_ATTEMPTS)
  assert.equal(after.attemptsLeft, 0)
  assert.equal(after.remainingMs, LOGIN_WINDOW_MS - 7000)

  const sameEmail = getLoginLock(' USER@example.com ', START + 7000, storage)
  assert.equal(sameEmail.locked, true)

  const otherEmail = getLoginLock('lain@example.com', START + 7000, storage)
  assert.equal(otherEmail.locked, false)
  assert.equal(otherEmail.attemptsLeft, LOGIN_MAX_ATTEMPTS)
})

test('percobaan tambahan setelah terkunci tidak menambah hitungan', () => {
  const storage = createStorage()
  for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
    recordFailedLogin('a@b.com', START + i * 1000, storage)
  }
  const next = recordFailedLogin('a@b.com', START + 8000, storage)
  assert.equal(next.count, LOGIN_MAX_ATTEMPTS)
  assert.equal(next.remainingMs, LOGIN_WINDOW_MS - 8000)
})

test('catatan dihapus otomatis setelah 30 menit', () => {
  const storage = createStorage()
  recordFailedLogin('a@b.com', START, storage)
  assert.equal(getLoginLock('a@b.com', START + 1000, storage).count, 1)

  const expired = getLoginLock('a@b.com', START + LOGIN_WINDOW_MS, storage)
  assert.equal(expired.count, 0)
  assert.equal(expired.locked, false)
  assert.equal(expired.attemptsLeft, LOGIN_MAX_ATTEMPTS)
})

test('login berhasil menghapus riwayat gagal email tersebut', () => {
  const storage = createStorage()
  recordFailedLogin('a@b.com', START, storage)
  recordFailedLogin('b@c.com', START, storage)
  clearLoginFailures('A@B.com', START + 1000, storage)

  assert.equal(getLoginLock('a@b.com', START + 1000, storage).count, 0)
  assert.equal(getLoginLock('b@c.com', START + 1000, storage).count, 1)
})

test('email kosong tidak pernah masuk pembatasan', () => {
  const storage = createStorage()
  const state = recordFailedLogin('   ', START, storage)
  assert.equal(state.locked, false)
  assert.equal(state.count, 0)
})

test('formatWait dan deteksi error kredensial', () => {
  assert.equal(formatWait(0), '1 detik')
  assert.equal(formatWait(45_000), '45 detik')
  assert.equal(formatWait(90_000), '1 menit 30 detik')
  assert.equal(formatWait(120_000), '2 menit')

  assert.equal(isCredentialError(new Error('Invalid login credentials')), true)
  assert.equal(isCredentialError({ message: 'invalid_credentials' }), true)
  assert.equal(isCredentialError('Wrong password'), true)
  assert.equal(isCredentialError('Email not confirmed'), false)
})
