// Excel/CSV ที่ตรวจแล้ว → JSON ใน packages/i18n/messages/<locale>/ (ดูแผน i18n ข้อ 6.1)
//
//   pnpm i18n:import docs/i18n-review/i18n-review-en-20260914.xlsx
//   pnpm i18n:import file.csv --locale en          (CSV ต้องระบุ locale เอง)
//   pnpm i18n:import file.xlsx --dry-run           ตรวจอย่างเดียว ไม่เขียนไฟล์
//
// กติกาที่บังคับ (ไม่ใช่แค่เตือน):
//   - key ไม่พบ หรือ th ถูกแก้        → ปฏิเสธแถว (ไฟล์เก่า/แก้ผิดช่อง)
//   - ตัวแปร {x} ในคำแปลไม่ครบ         → ปฏิเสธแถว พร้อมบอกว่าขาดตัวไหน
//   - must_review = Y แต่ยังไม่ reviewed → ไม่เขียนทับ รายงานเป็น "ค้างตรวจ"
//   - คำแปลว่าง                        → ข้าม (ยังใช้ค่าเดิม/fallback)
import path from 'node:path'
import ExcelJS from 'exceljs'
import {
  LOCALES,
  META_SHEETS,
  ROOT,
  loadLocaleMessages,
  missingPlaceholders,
  parseArgs,
  writeNamespace,
} from './i18n-lib.mjs'

const args = parseArgs(process.argv.slice(2))
const file = args._[0]
if (!file) {
  console.error('ระบุไฟล์ .xlsx หรือ .csv ที่ตรวจแล้ว')
  process.exit(2)
}
const filePath = path.resolve(ROOT, file)
const isCsv = /\.csv$/i.test(filePath)

const workbook = new ExcelJS.Workbook()
if (isCsv) await workbook.csv.readFile(filePath)
else await workbook.xlsx.readFile(filePath)

const sheets = workbook.worksheets.filter((sheet) => !META_SHEETS.has(sheet.name))
if (sheets.length === 0) {
  console.error('ไม่พบชีตข้อมูลในไฟล์')
  process.exit(2)
}

// หา locale จาก header ของชีตแรก (คอลัมน์ที่เป็นชื่อภาษาที่รองรับ) หรือจาก --locale
function headerMap(sheet) {
  const map = {}
  sheet.getRow(1).eachCell((cell, col) => {
    map[String(cell.text ?? '').trim()] = col
  })
  return map
}
const firstHeader = headerMap(sheets[0])
const locale = String(args.locale ?? LOCALES.find((code) => code !== 'th' && firstHeader[code]) ?? '')
if (!LOCALES.includes(locale) || locale === 'th') {
  console.error('หา locale จากหัวคอลัมน์ไม่ได้ — ระบุ --locale en หรือ --locale id')
  process.exit(2)
}

const th = await loadLocaleMessages('th')
const current = await loadLocaleMessages(locale)
const next = structuredClone(current)

const rejected = []
const pending = []
let written = 0
let skippedEmpty = 0
let unchanged = 0

function cellText(row, col) {
  if (!col) return ''
  const value = row.getCell(col).text
  return String(value ?? '').replace(/\r\n?/g, '\n')
}

for (const sheet of sheets) {
  const columns = headerMap(sheet)
  if (!columns.key || !columns.th || !columns[locale]) {
    rejected.push({ sheet: sheet.name, key: '(ทั้งชีต)', reason: `หัวคอลัมน์ไม่ครบ ต้องมี key, th, ${locale}` })
    continue
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const key = cellText(row, columns.key).trim()
    if (!key) return
    const namespace = cellText(row, columns.namespace).trim() || sheet.name
    const where = { sheet: sheet.name, row: rowNumber, key: `${namespace}.${key}` }

    const source = th[namespace]?.[key]
    if (source === undefined) {
      rejected.push({ ...where, reason: 'ไม่พบ key นี้ในต้นฉบับภาษาไทย (ไฟล์เก่า หรือ key ถูกแก้)' })
      return
    }
    if (cellText(row, columns.th) !== source) {
      rejected.push({ ...where, reason: 'คอลัมน์ th ถูกแก้ — ต้นฉบับต้องไม่เปลี่ยน' })
      return
    }

    const translated = cellText(row, columns[locale])
    if (!translated.trim()) {
      skippedEmpty++
      return
    }

    const missing = missingPlaceholders(source, translated)
    if (missing.length > 0) {
      rejected.push({ ...where, reason: `ตัวแปรหาย: ${missing.map((name) => `{${name}}`).join(' ')}` })
      return
    }

    const review = cellText(row, columns.must_review).trim().toUpperCase() === 'Y'
    const status = cellText(row, columns.status).trim().toLowerCase()
    if (review && status !== 'reviewed') {
      pending.push({ ...where, status: status || 'draft' })
      return
    }

    if (next[namespace]?.[key] === translated) {
      unchanged++
      return
    }
    next[namespace] ??= {}
    next[namespace][key] = translated
    written++
  })
}

// ── เขียนกลับ ───────────────────────────────────────────────────────────────
const touched = Object.keys(next).filter((namespace) => JSON.stringify(next[namespace]) !== JSON.stringify(current[namespace] ?? {}))
if (!args['dry-run']) {
  for (const namespace of touched) {
    // เรียงคีย์ตามลำดับต้นฉบับไทย เพื่อให้ diff อ่านง่ายและไฟล์ทุกภาษาหน้าตาเหมือนกัน
    const ordered = {}
    for (const key of Object.keys(th[namespace] ?? {})) if (next[namespace][key] !== undefined) ordered[key] = next[namespace][key]
    for (const [key, value] of Object.entries(next[namespace])) if (ordered[key] === undefined) ordered[key] = value
    const target = await writeNamespace(locale, namespace, ordered)
    console.log(`เขียน ${path.relative(ROOT, target)}`)
  }
}

// ── สรุป ────────────────────────────────────────────────────────────────────
console.log(`\nสรุปการนำเข้า (${locale}${args['dry-run'] ? ', dry-run' : ''})`)
console.log(`  เขียนใหม่/เปลี่ยน ${written} · เหมือนเดิม ${unchanged} · ว่าง (ข้าม) ${skippedEmpty}`)
console.log(`  ปฏิเสธ ${rejected.length} · ค้างตรวจ (must_review) ${pending.length}`)

if (rejected.length > 0) {
  console.log('\nแถวที่ถูกปฏิเสธ')
  for (const item of rejected) console.log(`  [${item.sheet}${item.row ? `:${item.row}` : ''}] ${item.key} — ${item.reason}`)
}
if (pending.length > 0) {
  console.log('\nแถว must_review ที่ยังไม่ reviewed (ยังใช้ค่าเดิม)')
  for (const item of pending) console.log(`  [${item.sheet}:${item.row}] ${item.key} (status=${item.status})`)
}

// ความครบของคีย์เทียบต้นฉบับ — บอกให้รู้ว่าเหลือแปลอีกเท่าไร
let totalKeys = 0
let translatedKeys = 0
for (const [namespace, keys] of Object.entries(th)) {
  for (const key of Object.keys(keys)) {
    totalKeys++
    if (next[namespace]?.[key]) translatedKeys++
  }
}
console.log(`\nความครบของ ${locale}: ${translatedKeys}/${totalKeys} คีย์ (${totalKeys ? Math.round((translatedKeys / totalKeys) * 100) : 0}%)`)

if (touched.some((namespace) => !current[namespace])) {
  console.log(`\n⚠️ มี namespace ใหม่ถูกสร้าง — อย่าลืม import ไฟล์ .json นั้นใน packages/i18n/messages/${locale}/index.ts`)
}
process.exit(rejected.length > 0 ? 1 : 0)
