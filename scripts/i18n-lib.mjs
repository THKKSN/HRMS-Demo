// ของใช้ร่วมของสคริปต์ i18n (scan / export / import)
// รันด้วย: node --experimental-strip-types scripts/<script>.mjs  (ต้องมี flag เพราะโหลด packages/i18n/src/labels.ts ตรง ๆ)
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const MESSAGES_DIR = path.join(ROOT, 'packages', 'i18n', 'messages')
// ที่เก็บ messages ทุกแหล่ง (D3): ส่วนกลางไม่มี prefix · ของแต่ละแอปอยู่ใต้ namespace ชื่อแอป (liff.<file>, admin.<file>)
// ตรงกับที่ apps/<app>/messages/<locale>/index.ts ประกอบไว้ ให้ key ในชีต Excel เท่ากับ key ที่โค้ดเรียกจริง
export const MESSAGE_SOURCES = [
  { prefix: '', dir: MESSAGES_DIR },
  { prefix: 'liff', dir: path.join(ROOT, 'apps', 'liff-web', 'messages') },
  { prefix: 'admin', dir: path.join(ROOT, 'apps', 'admin-web', 'messages') },
]
export const GLOSSARY_PATH = path.join(ROOT, 'packages', 'i18n', 'GLOSSARY.md')
// docs/ อยู่ใน .gitignore อยู่แล้ว — ไฟล์ Excel เป็นของชั่วคราวระหว่างรอบตรวจ ไม่ใช่ source of truth
export const REVIEW_DIR = path.join(ROOT, 'docs', 'i18n-review')
export const LOCALES = ['th', 'en', 'id']
export const REVIEW_STATUSES = ['draft', 'reviewed', 'needs_context']
// รหัสปลดล็อกชีต — ใส่ไว้กันมือลั่นแก้คอลัมน์ต้นฉบับ ไม่ได้มีไว้กันใคร
export const REVIEW_SHEET_PASSWORD = 'hrms-i18n'
export const META_SHEETS = new Set(['README', 'GLOSSARY'])

export function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out)
    else out[full] = String(value)
  }
  return out
}

export function unflatten(flat) {
  const out = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let cursor = out
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value
      else cursor = cursor[part] ??= {}
    })
  }
  return out
}

async function listJsonFiles(dir) {
  try {
    return (await readdir(dir)).filter((file) => file.endsWith('.json')).sort()
  } catch {
    return [] // แอปที่ยังไม่มี messages (admin ก่อน Phase 2)
  }
}

/**
 * อ่าน messages ของภาษาหนึ่งเป็น { namespace: { 'dot.key': 'ข้อความ' } } จากทุกแหล่งใน MESSAGE_SOURCES
 * - th: namespace `status` มาจาก src/labels.ts (TS) ส่วนที่เหลือเป็น JSON
 * - ภาษาอื่น: JSON ทั้งหมด (รวม status.json ที่แปลแล้ว)
 * - ของแอปได้ namespace แบบ `liff.external` (ไฟล์ apps/liff-web/messages/<locale>/external.json)
 */
export async function loadLocaleMessages(locale) {
  const result = {}
  if (locale === 'th') {
    const { STATUS_MESSAGES } = await import('../packages/i18n/src/labels.ts')
    result.status = flatten(STATUS_MESSAGES)
  }
  for (const source of MESSAGE_SOURCES) {
    const dir = path.join(source.dir, locale)
    for (const file of await listJsonFiles(dir)) {
      const name = file.replace(/\.json$/, '')
      const namespace = source.prefix ? `${source.prefix}.${name}` : name
      const json = JSON.parse(await readFile(path.join(dir, file), 'utf8'))
      result[namespace] = { ...(result[namespace] ?? {}), ...flatten(json) }
    }
  }
  return result
}

// namespace → โฟลเดอร์ + ชื่อไฟล์ (กลับทางกับ loadLocaleMessages)
function resolveNamespaceFile(locale, namespace) {
  const [head, ...rest] = namespace.split('.')
  const source = rest.length > 0 ? MESSAGE_SOURCES.find((item) => item.prefix === head) : undefined
  if (source) return { dir: path.join(source.dir, locale), file: `${rest.join('.')}.json` }
  return { dir: path.join(MESSAGES_DIR, locale), file: `${namespace}.json` }
}

export async function writeNamespace(locale, namespace, flat) {
  const { dir, file } = resolveNamespaceFile(locale, namespace)
  await mkdir(dir, { recursive: true })
  const target = path.join(dir, file)
  await writeFile(target, `${JSON.stringify(unflatten(flat), null, 2)}\n`, 'utf8')
  return target
}

// ตัวแปร ICU ในข้อความ เช่น {count}, {name}, {count, plural, …} → ['count','name']
export function placeholders(text) {
  const found = new Set()
  for (const match of String(text ?? '').matchAll(/\{\s*([A-Za-z0-9_]+)/g)) found.add(match[1])
  return [...found].sort()
}

export function missingPlaceholders(source, translated) {
  const have = new Set(placeholders(translated))
  return placeholders(source).filter((name) => !have.has(name))
}

// 3 กลุ่มที่ต้องมีคนตรวจเสมอ: ปุ่มที่ย้อนกลับไม่ได้ / ข้อความเตือน / กฎหมาย-ความเป็นส่วนตัว (ดูแผน i18n ข้อ 6.1)
const RISK_KEY = /(delete|remove|cancel|confirm|warning|danger|privacy|consent|reject|irreversible|logout|reset|destroy)/i
const RISK_TH = /(ลบ|ยกเลิก|ยืนยัน|ถาวร|ย้อนกลับไม่ได้|ไม่สามารถย้อน|ความเป็นส่วนตัว|ยินยอม|ปฏิเสธ|ออกจากระบบ|รีเซ็ต|คำเตือน)/

export function mustReview(key, thaiText) {
  return RISK_KEY.test(key) || RISK_TH.test(thaiText ?? '')
}

export function todayStamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
}

// อ่านตารางศัพท์จาก GLOSSARY.md (แถว markdown table ที่มีคอลัมน์ ไทย | en | id | หมายเหตุ)
export async function loadGlossary() {
  let text = ''
  try {
    text = await readFile(GLOSSARY_PATH, 'utf8')
  } catch {
    return []
  }
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 2) continue
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue
    if (cells[0] === 'ไทย') continue
    rows.push({ th: cells[0], en: cells[1] ?? '', id: cells[2] ?? '', note: cells[3] ?? '' })
  }
  return rows
}

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i]
    if (item.startsWith('--')) {
      const name = item.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        args[name] = next
        i++
      } else {
        args[name] = true
      }
    } else {
      args._.push(item)
    }
  }
  return args
}
