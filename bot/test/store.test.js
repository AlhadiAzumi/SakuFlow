import assert from 'node:assert/strict'
import test from 'node:test'
import { monthRange } from '../src/store.js'

test('rentang bulan November berakhir di 30, bukan 31', () => {
  assert.deepEqual(monthRange('2026-11'), { start: '2026-11-01', end: '2026-11-30' })
})

test('rentang bulan 31 hari tetap benar', () => {
  assert.deepEqual(monthRange('2026-01'), { start: '2026-01-01', end: '2026-01-31' })
  assert.deepEqual(monthRange('2026-12'), { start: '2026-12-01', end: '2026-12-31' })
})

test('Februari mengikuti tahun kabisat', () => {
  assert.deepEqual(monthRange('2026-02'), { start: '2026-02-01', end: '2026-02-28' })
  assert.deepEqual(monthRange('2024-02'), { start: '2024-02-01', end: '2024-02-29' })
})

test('bulan lain dengan 30 hari', () => {
  for (const month of ['04', '06', '09']) {
    assert.equal(monthRange(`2026-${month}`).end, `2026-${month}-30`)
  }
})
