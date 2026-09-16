import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COUNTRY_CALLING_CODES,
  callingCodeOf,
  countryFlag,
  countryName,
  isE164,
  isSupportedCountry,
  parseE164,
  sortedCountries,
  toE164,
} from './countries.ts'
import { formatPhone } from './format.ts'

test('ตารางรหัสประเทศครบถ้วนและไม่มี ISO ซ้ำ', () => {
  const isoList = COUNTRY_CALLING_CODES.map((country) => country.iso)
  assert.equal(new Set(isoList).size, isoList.length, 'ISO ต้องไม่ซ้ำ')
  assert.ok(COUNTRY_CALLING_CODES.length > 200, 'ต้องครอบคลุมเกือบทุกประเทศ')

  for (const { iso, calling } of COUNTRY_CALLING_CODES) {
    assert.match(iso, /^[A-Z]{2}$/, `${iso} ต้องเป็น ISO alpha-2`)
    assert.match(calling, /^[1-9]\d{0,2}$/, `รหัสโทรของ ${iso} ต้องเป็นตัวเลข 1-3 หลัก ไม่ขึ้นต้นด้วย 0`)
  }
})

test('ค้นรหัสโทรจาก ISO', () => {
  assert.equal(callingCodeOf('TH'), '66')
  assert.equal(callingCodeOf('sg'), '65')
  assert.equal(callingCodeOf('XX'), undefined)
  assert.equal(isSupportedCountry('TH'), true)
  assert.equal(isSupportedCountry(null), false)
})

test('toE164 ตัด 0 นำหน้าของเบอร์ไทย', () => {
  assert.equal(toE164('66', '081-234-5678'), '+66812345678')
  assert.equal(toE164('66', '0812345678'), '+66812345678')
  assert.equal(toE164('66', '81 234 5678'), '+66812345678')
})

test('toE164 กับประเทศที่ไม่มี 0 นำหน้า', () => {
  assert.equal(toE164('65', '9123 4567'), '+6591234567')
  assert.equal(toE164('1', '(202) 555-0123'), '+12025550123')
})

test('toE164 กับเบอร์อังกฤษที่มี 0 นำหน้า', () => {
  assert.equal(toE164('44', '07911 123456'), '+447911123456')
})

test('toE164 ไม่เติมรหัสประเทศซ้ำเมื่อผู้ใช้วางเบอร์สากลมาทั้งก้อน', () => {
  assert.equal(toE164('66', '+6591234567'), '+6591234567')
  assert.equal(toE164('66', '006591234567'), '+6591234567')
})

test('toE164 คืนค่าว่างเมื่อไม่มีตัวเลขพอ', () => {
  assert.equal(toE164('66', ''), '')
  assert.equal(toE164('66', '---'), '')
  assert.equal(toE164('', '0812345678'), '')
})

test('isE164 ตรวจรูปแบบตามสเปก', () => {
  assert.equal(isE164('+66812345678'), true)
  assert.equal(isE164('+6591234567'), true)
  assert.equal(isE164('0812345678'), false, 'ต้องมี + นำหน้า')
  assert.equal(isE164('+0812345678'), false, 'รหัสประเทศห้ามขึ้นต้นด้วย 0')
  assert.equal(isE164('+66 81 234 5678'), false, 'ห้ามมีเว้นวรรค')
  assert.equal(isE164('+661234'), false, 'สั้นเกินสเปก')
  assert.equal(isE164('+6612345678901234'), false, 'ยาวเกิน 15 หลัก')
  assert.equal(isE164(null), false)
})

test('parseE164 แยกเบอร์กลับเป็นรหัสประเทศ + เบอร์ในประเทศ', () => {
  assert.deepEqual(parseE164('+66812345678'), {
    country: 'TH', callingCode: '66', nationalNumber: '812345678',
  })
  assert.deepEqual(parseE164('+6591234567'), {
    country: 'SG', callingCode: '65', nationalNumber: '91234567',
  })
})

test('parseE164 ใช้ประเทศที่บันทึกไว้ตัดสินเมื่อรหัสโทรใช้ร่วมกัน', () => {
  assert.equal(parseE164('+12025550123')?.country, 'US', 'ไม่ระบุ → ประเทศหลักของ +1')
  assert.equal(parseE164('+12025550123', 'CA')?.country, 'CA', 'ระบุแคนาดา → ต้องได้แคนาดา')
  assert.equal(parseE164('+77012345678', 'KZ')?.country, 'KZ')
  assert.equal(parseE164('+79012345678')?.country, 'RU')
})

test('parseE164 คืน null เมื่อไม่ใช่ E.164', () => {
  assert.equal(parseE164('0812345678'), null)
  assert.equal(parseE164(''), null)
  assert.equal(parseE164(null), null)
})

test('ประกอบแล้วแยกกลับได้ค่าเดิม', () => {
  const cases = [
    { iso: 'TH', calling: '66', input: '081-234-5678' },
    { iso: 'SG', calling: '65', input: '9123 4567' },
    { iso: 'JP', calling: '81', input: '090-1234-5678' },
  ]
  for (const { iso, calling, input } of cases) {
    const e164 = toE164(calling, input)
    const parsed = parseE164(e164, iso)
    assert.equal(parsed?.country, iso)
    assert.equal(toE164(calling, parsed!.nationalNumber), e164)
  }
})

test('countryName แปลตามภาษาที่เลือก', () => {
  assert.equal(countryName('TH', 'en'), 'Thailand')
  assert.equal(countryName('SG', 'en'), 'Singapore')
  // ภาษาไทยมาจาก ICU ของ runtime — ตรวจแค่ว่าไม่ตกกลับเป็น ISO code
  assert.notEqual(countryName('TH', 'th'), 'TH')
  // QQ เป็นรหัสที่ CLDR ไม่ได้ตั้งชื่อไว้ (ต่างจาก ZZ ที่มีชื่อว่า "Unknown Region")
  assert.equal(countryName('QQ', 'en'), 'QQ', 'ISO ที่ไม่รู้จักคืน code เดิม')
  assert.equal(countryName('ไม่ใช่รหัส', 'en'), 'ไม่ใช่รหัส'.toUpperCase(), 'ค่าที่ผิดรูปแบบต้องไม่ทำให้ throw')
})

test('countryFlag แปลง ISO เป็นธง', () => {
  assert.equal(countryFlag('TH'), '🇹🇭')
  assert.equal(countryFlag('sg'), '🇸🇬')
  assert.equal(countryFlag('X'), '')
})

test('sortedCountries ปักหมุดไทยไว้บนสุดและเรียงที่เหลือตามชื่อ', () => {
  const list = sortedCountries('en')
  assert.equal(list[0].iso, 'TH')
  assert.equal(list.length, COUNTRY_CALLING_CODES.length)
  assert.equal(new Set(list.map((country) => country.iso)).size, list.length, 'ห้ามซ้ำ')

  const names = list.slice(1).map((country) => countryName(country.iso, 'en'))
  const sorted = [...names].sort(new Intl.Collator('en-GB').compare)
  assert.deepEqual(names, sorted)
})

test('formatPhone จัดกลุ่มให้อ่านง่าย', () => {
  assert.equal(formatPhone('+66812345678'), '+66 81 234 5678')
  assert.equal(formatPhone('+6591234567'), '+65 9123 4567')
  assert.equal(formatPhone('+12025550123'), '+1 202 555 0123')
})

test('formatPhone คืนค่าเดิมเมื่อไม่ใช่ E.164 (ข้อมูลเก่าที่ยังไม่ backfill)', () => {
  assert.equal(formatPhone('081-234-5678'), '081-234-5678')
  assert.equal(formatPhone(''), '')
  assert.equal(formatPhone(null), '')
})
