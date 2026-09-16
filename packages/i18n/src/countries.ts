import { DEFAULT_LOCALE, INTL_LOCALE_TAG, type Locale } from './locales.ts'

/**
 * รหัสโทรศัพท์ประเทศ + ตัวช่วยประกอบ/แยกเบอร์แบบ E.164
 * (แผน: docs/external-reporter-phone-e164-plan.md — Phase 0)
 *
 * เก็บเฉพาะ ISO code กับรหัสโทร ไม่เก็บชื่อประเทศ เพราะชื่อได้จาก `Intl.DisplayNames` ของ runtime
 * ครบทุกภาษาที่ระบบรองรับอยู่แล้ว — ไม่ต้องแปล 240 ประเทศ × 3 ภาษา และไม่ต้องพึ่ง libphonenumber
 */

export type CountryCallingCode = {
  /** ISO 3166-1 alpha-2 เช่น TH, SG */
  iso: string
  /** รหัสโทรประเทศ ไม่มีเครื่องหมาย + เช่น '66' */
  calling: string
}

// ISO 3166-1 alpha-2 + รหัสโทรตาม ITU-T E.164 (เรียงตาม ISO)
export const COUNTRY_CALLING_CODES: readonly CountryCallingCode[] = [
  { iso: 'AD', calling: '376' }, { iso: 'AE', calling: '971' }, { iso: 'AF', calling: '93' },
  { iso: 'AG', calling: '1' }, { iso: 'AI', calling: '1' }, { iso: 'AL', calling: '355' },
  { iso: 'AM', calling: '374' }, { iso: 'AO', calling: '244' }, { iso: 'AQ', calling: '672' },
  { iso: 'AR', calling: '54' }, { iso: 'AS', calling: '1' }, { iso: 'AT', calling: '43' },
  { iso: 'AU', calling: '61' }, { iso: 'AW', calling: '297' }, { iso: 'AX', calling: '358' },
  { iso: 'AZ', calling: '994' },
  { iso: 'BA', calling: '387' }, { iso: 'BB', calling: '1' }, { iso: 'BD', calling: '880' },
  { iso: 'BE', calling: '32' }, { iso: 'BF', calling: '226' }, { iso: 'BG', calling: '359' },
  { iso: 'BH', calling: '973' }, { iso: 'BI', calling: '257' }, { iso: 'BJ', calling: '229' },
  { iso: 'BL', calling: '590' }, { iso: 'BM', calling: '1' }, { iso: 'BN', calling: '673' },
  { iso: 'BO', calling: '591' }, { iso: 'BQ', calling: '599' }, { iso: 'BR', calling: '55' },
  { iso: 'BS', calling: '1' }, { iso: 'BT', calling: '975' }, { iso: 'BW', calling: '267' },
  { iso: 'BY', calling: '375' }, { iso: 'BZ', calling: '501' },
  { iso: 'CA', calling: '1' }, { iso: 'CC', calling: '61' }, { iso: 'CD', calling: '243' },
  { iso: 'CF', calling: '236' }, { iso: 'CG', calling: '242' }, { iso: 'CH', calling: '41' },
  { iso: 'CI', calling: '225' }, { iso: 'CK', calling: '682' }, { iso: 'CL', calling: '56' },
  { iso: 'CM', calling: '237' }, { iso: 'CN', calling: '86' }, { iso: 'CO', calling: '57' },
  { iso: 'CR', calling: '506' }, { iso: 'CU', calling: '53' }, { iso: 'CV', calling: '238' },
  { iso: 'CW', calling: '599' }, { iso: 'CX', calling: '61' }, { iso: 'CY', calling: '357' },
  { iso: 'CZ', calling: '420' },
  { iso: 'DE', calling: '49' }, { iso: 'DJ', calling: '253' }, { iso: 'DK', calling: '45' },
  { iso: 'DM', calling: '1' }, { iso: 'DO', calling: '1' }, { iso: 'DZ', calling: '213' },
  { iso: 'EC', calling: '593' }, { iso: 'EE', calling: '372' }, { iso: 'EG', calling: '20' },
  { iso: 'EH', calling: '212' }, { iso: 'ER', calling: '291' }, { iso: 'ES', calling: '34' },
  { iso: 'ET', calling: '251' },
  { iso: 'FI', calling: '358' }, { iso: 'FJ', calling: '679' }, { iso: 'FK', calling: '500' },
  { iso: 'FM', calling: '691' }, { iso: 'FO', calling: '298' }, { iso: 'FR', calling: '33' },
  { iso: 'GA', calling: '241' }, { iso: 'GB', calling: '44' }, { iso: 'GD', calling: '1' },
  { iso: 'GE', calling: '995' }, { iso: 'GF', calling: '594' }, { iso: 'GG', calling: '44' },
  { iso: 'GH', calling: '233' }, { iso: 'GI', calling: '350' }, { iso: 'GL', calling: '299' },
  { iso: 'GM', calling: '220' }, { iso: 'GN', calling: '224' }, { iso: 'GP', calling: '590' },
  { iso: 'GQ', calling: '240' }, { iso: 'GR', calling: '30' }, { iso: 'GS', calling: '500' },
  { iso: 'GT', calling: '502' }, { iso: 'GU', calling: '1' }, { iso: 'GW', calling: '245' },
  { iso: 'GY', calling: '592' },
  { iso: 'HK', calling: '852' }, { iso: 'HN', calling: '504' }, { iso: 'HR', calling: '385' },
  { iso: 'HT', calling: '509' }, { iso: 'HU', calling: '36' },
  { iso: 'ID', calling: '62' }, { iso: 'IE', calling: '353' }, { iso: 'IL', calling: '972' },
  { iso: 'IM', calling: '44' }, { iso: 'IN', calling: '91' }, { iso: 'IO', calling: '246' },
  { iso: 'IQ', calling: '964' }, { iso: 'IR', calling: '98' }, { iso: 'IS', calling: '354' },
  { iso: 'IT', calling: '39' },
  { iso: 'JE', calling: '44' }, { iso: 'JM', calling: '1' }, { iso: 'JO', calling: '962' },
  { iso: 'JP', calling: '81' },
  { iso: 'KE', calling: '254' }, { iso: 'KG', calling: '996' }, { iso: 'KH', calling: '855' },
  { iso: 'KI', calling: '686' }, { iso: 'KM', calling: '269' }, { iso: 'KN', calling: '1' },
  { iso: 'KP', calling: '850' }, { iso: 'KR', calling: '82' }, { iso: 'KW', calling: '965' },
  { iso: 'KY', calling: '1' }, { iso: 'KZ', calling: '7' },
  { iso: 'LA', calling: '856' }, { iso: 'LB', calling: '961' }, { iso: 'LC', calling: '1' },
  { iso: 'LI', calling: '423' }, { iso: 'LK', calling: '94' }, { iso: 'LR', calling: '231' },
  { iso: 'LS', calling: '266' }, { iso: 'LT', calling: '370' }, { iso: 'LU', calling: '352' },
  { iso: 'LV', calling: '371' }, { iso: 'LY', calling: '218' },
  { iso: 'MA', calling: '212' }, { iso: 'MC', calling: '377' }, { iso: 'MD', calling: '373' },
  { iso: 'ME', calling: '382' }, { iso: 'MF', calling: '590' }, { iso: 'MG', calling: '261' },
  { iso: 'MH', calling: '692' }, { iso: 'MK', calling: '389' }, { iso: 'ML', calling: '223' },
  { iso: 'MM', calling: '95' }, { iso: 'MN', calling: '976' }, { iso: 'MO', calling: '853' },
  { iso: 'MP', calling: '1' }, { iso: 'MQ', calling: '596' }, { iso: 'MR', calling: '222' },
  { iso: 'MS', calling: '1' }, { iso: 'MT', calling: '356' }, { iso: 'MU', calling: '230' },
  { iso: 'MV', calling: '960' }, { iso: 'MW', calling: '265' }, { iso: 'MX', calling: '52' },
  { iso: 'MY', calling: '60' }, { iso: 'MZ', calling: '258' },
  { iso: 'NA', calling: '264' }, { iso: 'NC', calling: '687' }, { iso: 'NE', calling: '227' },
  { iso: 'NF', calling: '672' }, { iso: 'NG', calling: '234' }, { iso: 'NI', calling: '505' },
  { iso: 'NL', calling: '31' }, { iso: 'NO', calling: '47' }, { iso: 'NP', calling: '977' },
  { iso: 'NR', calling: '674' }, { iso: 'NU', calling: '683' }, { iso: 'NZ', calling: '64' },
  { iso: 'OM', calling: '968' },
  { iso: 'PA', calling: '507' }, { iso: 'PE', calling: '51' }, { iso: 'PF', calling: '689' },
  { iso: 'PG', calling: '675' }, { iso: 'PH', calling: '63' }, { iso: 'PK', calling: '92' },
  { iso: 'PL', calling: '48' }, { iso: 'PM', calling: '508' }, { iso: 'PN', calling: '64' },
  { iso: 'PR', calling: '1' }, { iso: 'PS', calling: '970' }, { iso: 'PT', calling: '351' },
  { iso: 'PW', calling: '680' }, { iso: 'PY', calling: '595' },
  { iso: 'QA', calling: '974' },
  { iso: 'RE', calling: '262' }, { iso: 'RO', calling: '40' }, { iso: 'RS', calling: '381' },
  { iso: 'RU', calling: '7' }, { iso: 'RW', calling: '250' },
  { iso: 'SA', calling: '966' }, { iso: 'SB', calling: '677' }, { iso: 'SC', calling: '248' },
  { iso: 'SD', calling: '249' }, { iso: 'SE', calling: '46' }, { iso: 'SG', calling: '65' },
  { iso: 'SH', calling: '290' }, { iso: 'SI', calling: '386' }, { iso: 'SJ', calling: '47' },
  { iso: 'SK', calling: '421' }, { iso: 'SL', calling: '232' }, { iso: 'SM', calling: '378' },
  { iso: 'SN', calling: '221' }, { iso: 'SO', calling: '252' }, { iso: 'SR', calling: '597' },
  { iso: 'SS', calling: '211' }, { iso: 'ST', calling: '239' }, { iso: 'SV', calling: '503' },
  { iso: 'SX', calling: '1' }, { iso: 'SY', calling: '963' }, { iso: 'SZ', calling: '268' },
  { iso: 'TC', calling: '1' }, { iso: 'TD', calling: '235' }, { iso: 'TG', calling: '228' },
  { iso: 'TH', calling: '66' }, { iso: 'TJ', calling: '992' }, { iso: 'TK', calling: '690' },
  { iso: 'TL', calling: '670' }, { iso: 'TM', calling: '993' }, { iso: 'TN', calling: '216' },
  { iso: 'TO', calling: '676' }, { iso: 'TR', calling: '90' }, { iso: 'TT', calling: '1' },
  { iso: 'TV', calling: '688' }, { iso: 'TW', calling: '886' }, { iso: 'TZ', calling: '255' },
  { iso: 'UA', calling: '380' }, { iso: 'UG', calling: '256' }, { iso: 'US', calling: '1' },
  { iso: 'UY', calling: '598' }, { iso: 'UZ', calling: '998' },
  { iso: 'VA', calling: '39' }, { iso: 'VC', calling: '1' }, { iso: 'VE', calling: '58' },
  { iso: 'VG', calling: '1' }, { iso: 'VI', calling: '1' }, { iso: 'VN', calling: '84' },
  { iso: 'VU', calling: '678' },
  { iso: 'WF', calling: '681' }, { iso: 'WS', calling: '685' },
  { iso: 'YE', calling: '967' }, { iso: 'YT', calling: '262' },
  { iso: 'ZA', calling: '27' }, { iso: 'ZM', calling: '260' }, { iso: 'ZW', calling: '263' },
]

/**
 * ประเทศหลักของรหัสที่มีหลายประเทศใช้ร่วมกัน — ใช้ตอนเดาประเทศจากเบอร์ที่ไม่รู้ ISO
 * (`+1` มี 20+ ประเทศ, `+7` มีรัสเซีย/คาซัคสถาน) เพื่อให้ผลลัพธ์นิ่งแทนที่จะขึ้นกับลำดับในตาราง
 */
const PRIMARY_COUNTRY_BY_CALLING_CODE: Record<string, string> = {
  '1': 'US', '7': 'RU', '39': 'IT', '44': 'GB', '47': 'NO', '61': 'AU', '64': 'NZ',
  '212': 'MA', '262': 'RE', '290': 'SH', '358': 'FI', '500': 'FK', '590': 'GP',
  '599': 'CW', '672': 'AQ',
}

const CALLING_BY_ISO: Record<string, string> = Object.fromEntries(
  COUNTRY_CALLING_CODES.map(({ iso, calling }) => [iso, calling]),
)

/** รหัสโทรของประเทศ (ไม่มี +) — คืน undefined ถ้าไม่รู้จัก ISO นั้น */
export function callingCodeOf(iso: string): string | undefined {
  return CALLING_BY_ISO[iso.toUpperCase()]
}

export function isSupportedCountry(iso: string | null | undefined): boolean {
  return !!iso && CALLING_BY_ISO[iso.toUpperCase()] !== undefined
}

const displayNamesCache = new Map<Locale, Intl.DisplayNames | null>()

function regionDisplayNames(locale: Locale): Intl.DisplayNames | null {
  if (!displayNamesCache.has(locale)) {
    try {
      displayNamesCache.set(locale, new Intl.DisplayNames([INTL_LOCALE_TAG[locale]], { type: 'region' }))
    } catch {
      // runtime ที่ไม่มี Intl.DisplayNames (หรือ ICU ไม่ครบ) — ตกไปใช้ ISO code แทน
      displayNamesCache.set(locale, null)
    }
  }
  return displayNamesCache.get(locale) ?? null
}

/** ชื่อประเทศในภาษาที่เลือก — fallback เป็น ISO code เมื่อ runtime ไม่รองรับ */
export function countryName(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const code = iso.toUpperCase()
  try {
    return regionDisplayNames(locale)?.of(code) ?? code
  } catch {
    return code
  }
}

/** ธง emoji จาก ISO code — เครื่องที่ไม่มี glyph จะแสดงเป็นตัวอักษร (เช่น TH) ซึ่งยังอ่านออก */
export function countryFlag(iso: string): string {
  const code = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65))
}

/** รายการประเทศเรียงตามชื่อในภาษาที่เลือก โดยปักหมุด `pinned` (ค่าเริ่มต้น: ไทย) ไว้บนสุด */
export function sortedCountries(
  locale: Locale = DEFAULT_LOCALE,
  pinned: readonly string[] = ['TH'],
): CountryCallingCode[] {
  const pinnedSet = new Set(pinned.map((iso) => iso.toUpperCase()))
  const collator = new Intl.Collator(INTL_LOCALE_TAG[locale])

  const head = pinned
    .map((iso) => COUNTRY_CALLING_CODES.find((country) => country.iso === iso.toUpperCase()))
    .filter((country): country is CountryCallingCode => !!country)

  const rest = COUNTRY_CALLING_CODES
    .filter((country) => !pinnedSet.has(country.iso))
    .sort((a, b) => collator.compare(countryName(a.iso, locale), countryName(b.iso, locale)))

  return [...head, ...rest]
}

/** E.164 = `+` ตามด้วยรหัสประเทศที่ไม่ขึ้นต้นด้วย 0 รวมทั้งหมด 7–15 หลัก */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/

export function isE164(value: string | null | undefined): boolean {
  return !!value && E164_PATTERN.test(value)
}

/**
 * ประกอบเบอร์เป็น E.164 จากรหัสประเทศ + เบอร์ในประเทศ
 *
 * ตัด 0 นำหน้า (trunk prefix) ออกเสมอ — ประเทศที่ไม่มี trunk prefix (US, SG) เบอร์ไม่ขึ้นต้นด้วย 0
 * อยู่แล้ว กติกานี้จึงใช้ได้ทุกประเทศโดยไม่ต้องมี metadata รายประเทศ
 * ถ้าผู้ใช้วางเบอร์ที่ขึ้นต้นด้วย `+` หรือ `00` มาทั้งก้อน จะถือว่าเป็นเบอร์สากลและไม่เติมรหัสประเทศซ้ำ
 */
export function toE164(callingCode: string, nationalNumber: string): string {
  const raw = nationalNumber.trim()
  if (raw.startsWith('+') || raw.startsWith('00')) {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
    return digits ? `+${digits}` : ''
  }

  const national = raw.replace(/\D/g, '').replace(/^0+/, '')
  const calling = callingCode.replace(/\D/g, '')
  if (!national || !calling) return ''
  return `+${calling}${national}`
}

export type ParsedPhone = {
  /** ISO ของประเทศที่เดาได้ — null เมื่อรหัสนั้นไม่ตรงประเทศใดในตาราง */
  country: string | null
  /** รหัสประเทศ ไม่มี + */
  callingCode: string
  /** เบอร์ส่วนที่เหลือหลังรหัสประเทศ */
  nationalNumber: string
}

/**
 * แยกเบอร์ E.164 กลับเป็นรหัสประเทศ + เบอร์ในประเทศ (สำหรับเปิดฟอร์มแก้ไข)
 *
 * `preferredCountry` คือ ISO ที่บันทึกไว้ในฐานข้อมูล — ใช้ตัดสินเมื่อรหัสโทรใช้ร่วมกันหลายประเทศ
 * จึงควรส่งมาเสมอถ้ามี เพราะ `+1` เดาเองได้แค่ US
 */
export function parseE164(phone: string | null | undefined, preferredCountry?: string | null): ParsedPhone | null {
  if (!isE164(phone)) return null

  const digits = phone!.slice(1)
  const preferred = preferredCountry?.toUpperCase()

  // รหัสประเทศยาว 1–3 หลัก — ไล่จากยาวไปสั้นเพื่อให้ได้ prefix ที่ยาวที่สุดที่ตรง
  for (const length of [3, 2, 1]) {
    const calling = digits.slice(0, length)
    const matches = COUNTRY_CALLING_CODES.filter((country) => country.calling === calling)
    if (matches.length === 0) continue

    const country = matches.find((item) => item.iso === preferred)?.iso
      ?? PRIMARY_COUNTRY_BY_CALLING_CODE[calling]
      ?? matches[0].iso

    return { country, callingCode: calling, nationalNumber: digits.slice(length) }
  }

  return { country: null, callingCode: '', nationalNumber: digits }
}
