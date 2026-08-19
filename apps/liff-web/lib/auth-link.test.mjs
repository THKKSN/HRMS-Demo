import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLinkPreviewPayload,
  buildOtpRequestPayload,
  normalizeEmployeeCode,
} from './auth-link.ts'

test('normalizes employee code by trimming only', () => {
  assert.equal(normalizeEmployeeCode('  Emp-001  '), 'Emp-001')
})

test('never pads or strips leading zeros on the client', () => {
  // การเติม/ตัด 0 ทำที่ server เท่านั้น (EmployeeCodeNormalizer)
  // ถ้า client เดาเอง สองฝั่งจะไม่ตรงกันแล้วผูกบัญชีไม่ได้
  assert.equal(normalizeEmployeeCode('  123  '), '123')
  assert.equal(normalizeEmployeeCode('00123'), '00123')
  assert.equal(normalizeEmployeeCode(' 07644 '), '07644')
})

test('builds preview payload without national ID', () => {
  const payload = buildLinkPreviewPayload('line-token', '  EMP001  ')

  assert.deepEqual(payload, { accessToken: 'line-token', employeeCode: 'EMP001' })
  assert.equal(Object.hasOwn(payload, 'nationalId'), false)
})

test('builds confirmed OTP payload with preview token only', () => {
  const payload = buildOtpRequestPayload('line-token', 'preview-token')

  assert.deepEqual(payload, { accessToken: 'line-token', previewToken: 'preview-token' })
  assert.equal(Object.hasOwn(payload, 'employeeCode'), false)
  assert.equal(Object.hasOwn(payload, 'nationalId'), false)
})
