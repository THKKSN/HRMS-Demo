import assert from 'node:assert/strict'
import test from 'node:test'

import { apiErrorText, apiErrorTextDetailed, type ErrorsTranslator } from './api-error.ts'

/** translator ปลอมที่รู้จักเฉพาะคีย์ที่ส่งเข้ามา — เลียนแบบ `useTranslations('errors')` */
function translator(dict: Record<string, string>): ErrorsTranslator {
  const t = ((key: string) => dict[key] ?? key) as unknown as ErrorsTranslator
  ;(t as unknown as { has: (key: string) => boolean }).has = (key: string) => key in dict
  return t
}

/** error จาก axios ที่ middleware ตอบกลับมา */
function apiError(data: unknown) {
  return { response: { data } }
}

const CATALOG = translator({
  VALIDATION_ERROR: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  VALIDATION_REQUIRED: 'กรุณากรอกข้อมูลในช่องนี้',
  TICKET_TEAM_MEMBER_REQUIRED: 'กรุณาเลือกผู้ร่วมงานอย่างน้อย 1 คน',
  TICKET_NOT_OPEN: 'รับเรื่องได้เฉพาะใบแจ้งเรื่องที่เป็นเรื่องใหม่',
})

test('code ของ field มาก่อน VALIDATION_ERROR ก้อนกลาง', () => {
  // ถ้าเช็ค code ก้อนกลางก่อน ผู้ใช้จะได้ "ข้อมูลไม่ถูกต้อง" แทนเหตุผลจริงว่าช่องไหนผิดยังไง
  const error = apiError({
    error: 'VALIDATION_ERROR',
    message: 'One or more fields are invalid.',
    details: [{ field: 'employeeIds', code: 'TICKET_TEAM_MEMBER_REQUIRED', message: 'At least one team member must be selected.' }],
  })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'กรุณาเลือกผู้ร่วมงานอย่างน้อย 1 คน')
})

test('rule ที่ไม่ได้ตั้ง code เองยังได้คำแปลจาก code กลางของ validator', () => {
  const error = apiError({
    error: 'VALIDATION_ERROR',
    details: [{ field: 'name', code: 'VALIDATION_REQUIRED', message: "'Name' must not be empty." }],
  })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'กรุณากรอกข้อมูลในช่องนี้')
})

test('code ที่ยังไม่มีคำแปล ตกไปใช้ข้อความจาก server ไม่ใช่ข้อความก้อนกลาง', () => {
  const error = apiError({
    error: 'VALIDATION_ERROR',
    details: [{ field: 'amount', code: 'NOT_IN_CATALOG_YET', message: 'Amount is out of range.' }],
  })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'Amount is out of range.')
})

test('ไม่มี details เลย → ใช้คำแปลของ VALIDATION_ERROR ตามเดิม', () => {
  const error = apiError({ error: 'VALIDATION_ERROR', message: 'One or more fields are invalid.' })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
})

test('error ทั่วไปที่ไม่ใช่ validation ยังใช้คำแปลของ code เดิม', () => {
  const error = apiError({ error: 'TICKET_NOT_OPEN', message: 'Only tickets in Open status can be accepted.' })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'รับเรื่องได้เฉพาะใบแจ้งเรื่องที่เป็นเรื่องใหม่')
  assert.equal(apiErrorText(error, CATALOG, 'สำรอง'), 'รับเรื่องได้เฉพาะใบแจ้งเรื่องที่เป็นเรื่องใหม่')
})

test('details รูปแบบเดิม (มี error ไม่มี code) ยังอ่านได้ระหว่าง deploy', () => {
  const error = apiError({
    error: 'VALIDATION_ERROR',
    details: [{ field: 'EmployeeIds', error: 'กรุณาเลือกผู้ร่วมงานอย่างน้อย 1 คน' }],
  })

  assert.equal(apiErrorTextDetailed(error, CATALOG, 'สำรอง'), 'กรุณาเลือกผู้ร่วมงานอย่างน้อย 1 คน')
})

test('ไม่มีอะไรให้เลย → fallback ของผู้เรียก', () => {
  assert.equal(apiErrorTextDetailed(new Error('boom'), CATALOG, 'สำรอง'), 'สำรอง')
})
