// JSON → Excel ให้ผู้ตรวจคำแปล (ดูแผน i18n ข้อ 6.1)
//
//   pnpm i18n:export --locale en                      → docs/i18n-review/i18n-review-en-<yyyymmdd>.xlsx
//   pnpm i18n:export --locale id --out path/to.xlsx
//   pnpm i18n:export --locale en --namespace ticket   เฉพาะ namespace เดียว
//
// 1 ชีตต่อ namespace · คอลัมน์ key/th/context/must_review ล็อกไว้ · ผู้ตรวจแก้ได้เฉพาะคำแปล, status, note
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import ExcelJS from 'exceljs'
import {
  LOCALES,
  META_SHEETS,
  REVIEW_DIR,
  REVIEW_SHEET_PASSWORD,
  REVIEW_STATUSES,
  ROOT,
  loadGlossary,
  loadLocaleMessages,
  mustReview,
  parseArgs,
  todayStamp,
} from './i18n-lib.mjs'

const args = parseArgs(process.argv.slice(2))
const locale = String(args.locale ?? '')
if (!LOCALES.includes(locale) || locale === 'th') {
  console.error('ต้องระบุ --locale en หรือ --locale id')
  process.exit(2)
}

const th = await loadLocaleMessages('th')
const target = await loadLocaleMessages(locale)
const namespaces = Object.keys(th)
  .filter((namespace) => !args.namespace || namespace === args.namespace)
  .sort()

if (namespaces.length === 0) {
  console.error('ไม่พบ namespace ที่ขอ')
  process.exit(2)
}

const workbook = new ExcelJS.Workbook()
workbook.creator = 'HRMS i18n export'

// ── README ───────────────────────────────────────────────────────────────────
const readme = workbook.addWorksheet('README')
readme.columns = [{ width: 110 }]
for (const line of [
  `ไฟล์ตรวจคำแปลภาษา "${locale}" — สร้างเมื่อ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
  '',
  'วิธีตรวจ',
  `1. แก้คำแปลในคอลัมน์ "${locale}" ได้เลย (ร่างจาก AI ใส่มาให้แล้ว)`,
  '2. ตรวจเสร็จแถวไหน เปลี่ยน status เป็น reviewed · ถ้าไม่แน่ใจว่าใช้ตรงไหน ใส่ needs_context แล้วเขียนคำถามใน note',
  '3. แถวที่ must_review = Y (ปุ่มลบ/ข้อความเตือน/ความเป็นส่วนตัว) ระบบจะไม่นำเข้าจนกว่าจะ reviewed',
  '4. ห้ามแก้คอลัมน์ key และ th — ถ้าแก้ แถวนั้นจะถูกปฏิเสธตอนนำเข้า',
  '5. ตัวแปรในปีกกา เช่น {count} {name} ต้องคงไว้ในคำแปลทุกตัว — ระบบใช้แทนค่าจริงตอนแสดง',
  '6. ขึ้นบรรทัดใหม่ในเซลล์ได้ตามปกติ (Alt+Enter)',
  '',
  `ชีตถูกล็อกกันมือลั่น — ถ้าต้องปลดล็อกใช้รหัส "${REVIEW_SHEET_PASSWORD}"`,
  'ศัพท์บังคับอยู่ในชีต GLOSSARY ท้ายสุด — คำเดียวกันต้องแปลเหมือนกันทุกหน้า',
]) {
  readme.addRow([line])
}
readme.getRow(1).font = { bold: true, size: 13 }
readme.getRow(3).font = { bold: true }

// ── ชีตต่อ namespace ─────────────────────────────────────────────────────────
const headers = ['namespace', 'key', 'th', locale, 'context', 'must_review', 'status', 'note']
const editable = new Set([locale, 'status', 'note'])
let totalKeys = 0
let totalTranslated = 0
let totalMustReview = 0

for (const namespace of namespaces) {
  if (META_SHEETS.has(namespace)) continue
  const sheet = workbook.addWorksheet(namespace)
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: { namespace: 12, key: 36, th: 42, [locale]: 42, context: 28, must_review: 12, status: 14, note: 32 }[header],
  }))
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }]
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}1` }

  for (const [key, thaiText] of Object.entries(th[namespace])) {
    const translated = target[namespace]?.[key] ?? ''
    const review = mustReview(key, thaiText)
    const context = key.split('.').slice(0, -1).join(' › ') || namespace
    const row = sheet.addRow({
      namespace,
      key,
      th: thaiText,
      [locale]: translated,
      context,
      must_review: review ? 'Y' : '',
      status: 'draft',
      note: '',
    })
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell('status').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${REVIEW_STATUSES.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'สถานะไม่ถูกต้อง',
      error: `เลือกได้เฉพาะ ${REVIEW_STATUSES.join(' / ')}`,
    }
    if (review) row.getCell('must_review').font = { bold: true, color: { argb: 'FFB45309' } }
    for (const header of headers) {
      row.getCell(header).protection = { locked: !editable.has(header) }
    }
    totalKeys++
    if (translated) totalTranslated++
    if (review) totalMustReview++
  }

  sheet.protect(REVIEW_SHEET_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
    formatRows: true,
    sort: true,
    autoFilter: true,
  })
}

// ── GLOSSARY ─────────────────────────────────────────────────────────────────
const glossary = await loadGlossary()
const glossarySheet = workbook.addWorksheet('GLOSSARY')
glossarySheet.columns = [
  { header: 'ไทย', key: 'th', width: 32 },
  { header: 'en', key: 'en', width: 32 },
  { header: 'id', key: 'id', width: 32 },
  { header: 'หมายเหตุ', key: 'note', width: 40 },
]
glossarySheet.getRow(1).font = { bold: true }
for (const row of glossary) glossarySheet.addRow(row)

// ── เขียนไฟล์ ───────────────────────────────────────────────────────────────
const out = args.out
  ? path.resolve(ROOT, String(args.out))
  : path.join(REVIEW_DIR, `i18n-review-${locale}-${todayStamp()}${args.namespace ? `-${args.namespace}` : ''}.xlsx`)
await mkdir(path.dirname(out), { recursive: true })
await workbook.xlsx.writeFile(out)

console.log(`เขียน ${path.relative(ROOT, out)}`)
console.log(`  namespace ${namespaces.length} ชีต · คีย์ ${totalKeys} · มีคำแปลแล้ว ${totalTranslated} · ต้องคนตรวจ (must_review) ${totalMustReview}`)
console.log(`  glossary ${glossary.length} คำ`)
