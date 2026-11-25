export const LOGIN_MAX_ATTEMPTS = 7
export const LOGIN_WINDOW_MS = 30 * 60 * 1000
export const LOGIN_WINDOW_LABEL = '30 menit'

const STORAGE_KEY = 'sakunode:login-attempts:v1'

const defaultStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const readAll = (storage) => {
  if (!storage) return {}
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const writeAll = (data, storage) => {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage bisa penuh atau diblokir. Pembatas tetap jalan di sesi ini.
  }
}

const prune = (data, now) => {
  Object.keys(data).forEach((key) => {
    const record = data[key]
    if (!record || !Number(record.firstAt) || now - Number(record.firstAt) >= LOGIN_WINDOW_MS) {
      delete data[key]
    }
  })
  return data
}

export const formatWait = (ms) => {
  const totalSeconds = Math.max(1, Math.ceil(Number(ms || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds} detik`
  return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`
}

export const getLoginLock = (email, now = Date.now(), storage = defaultStorage()) => {
  const key = normalizeEmail(email)
  if (!key) {
    return { locked: false, remainingMs: 0, attemptsLeft: LOGIN_MAX_ATTEMPTS, count: 0 }
  }

  const data = prune(readAll(storage), now)
  const record = data[key]
  writeAll(data, storage)

  if (!record) {
    return { locked: false, remainingMs: 0, attemptsLeft: LOGIN_MAX_ATTEMPTS, count: 0 }
  }

  const firstAt = Number(record.firstAt) || now
  const remainingMs = Math.max(0, LOGIN_WINDOW_MS - (now - firstAt))
  const count = Number(record.count) || 0
  const locked = count >= LOGIN_MAX_ATTEMPTS || remainingMs <= 0

  return {
    locked,
    remainingMs,
    attemptsLeft: Math.max(0, LOGIN_MAX_ATTEMPTS - count),
    count,
  }
}

export const recordFailedLogin = (email, now = Date.now(), storage = defaultStorage()) => {
  const key = normalizeEmail(email)
  if (!key) return getLoginLock(email, now, storage)

  const current = getLoginLock(email, now, storage)
  if (current.locked && current.count >= LOGIN_MAX_ATTEMPTS) return current

  const data = prune(readAll(storage), now)
  const previous = data[key]
  const firstAt = Number(previous?.firstAt) || now
  const record = {
    count: (Number(previous?.count) || 0) + 1,
    firstAt,
  }
  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    record.blockedUntil = firstAt + LOGIN_WINDOW_MS
  }
  data[key] = record
  writeAll(data, storage)

  return getLoginLock(email, now, storage)
}

export const clearLoginFailures = (email, now = Date.now(), storage = defaultStorage()) => {
  const key = normalizeEmail(email)
  if (!key) return
  const data = prune(readAll(storage), now)
  delete data[key]
  writeAll(data, storage)
}

export const isCredentialError = (error) => {
  const text = String(error?.message || error || '').toLowerCase()
  return (
    text.includes('invalid login credentials')
    || text.includes('invalid_credentials')
    || text.includes('wrong password')
  )
}
