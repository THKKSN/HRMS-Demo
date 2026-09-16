import assert from 'node:assert/strict'
import test from 'node:test'

import { duration } from './format-duration.ts'

test('returns a dash when there is no value', () => {
  assert.equal(duration(null), '—')
  assert.equal(duration(undefined), '—')
  assert.equal(duration(Number.NaN), '—')
})

test('shows whole minutes under an hour', () => {
  assert.equal(duration(0), '0 นาที')
  assert.equal(duration(44.6), '45 นาที')
  assert.equal(duration(59.4), '59 นาที')
})

test('shows hours and minutes under a day instead of decimal hours', () => {
  assert.equal(duration(60), '1 ชม.')
  assert.equal(duration(90), '1 ชม. 30 นาที')
  assert.equal(duration(59.6), '1 ชม.')
  assert.equal(duration(1439), '23 ชม. 59 นาที')
})

test('shows days and hours from a day up instead of decimal days', () => {
  assert.equal(duration(1440), '1 วัน')
  assert.equal(duration(2160), '1 วัน 12 ชม.')
  assert.equal(duration(4320), '3 วัน')
  assert.equal(duration(4320 + 5 * 60 + 40), '3 วัน 6 ชม.')
})

test('never renders 24 hours after rounding at a day boundary', () => {
  assert.equal(duration(1439.6), '1 วัน')
  assert.equal(duration(2 * 1440 - 20), '2 วัน')
})

test('clamps negative input to zero', () => {
  assert.equal(duration(-15), '0 นาที')
})
