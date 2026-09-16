// สแกนข้อความ error ของ API ว่าพร้อมหลายภาษาหรือยัง (ไม่นับ comment) — คู่ฝั่ง backend ของ `i18n:scan`
//
// ตามกติกา D7 (แผน i18n ข้อ 3) API ต้องส่ง `code` + `message` **ภาษาอังกฤษ** เท่านั้น
// ผู้ใช้เห็นคำแปลจาก `errors.<CODE>` เสมอ · จึงต้องผ่าน 2 ด่านคู่กัน ไม่ใช่ด่านเดียว:
//   1. ไม่มีข้อความไทยที่จุด throw/return — ไทยที่หลุดออกมาแปลว่าเส้นทางนั้นยังไม่มี code
//   2. code ที่ API ส่งได้ทุกตัวมีคำแปลครบ th/en — code ที่ไม่มีคำแปลทำให้ผู้ใช้เห็น `message` ดิบจาก server
// ด่านแรกผ่านอย่างเดียวไม่พอ: เส้นทางที่ message เป็นอังกฤษแล้วแต่ code ยังไม่มีคำแปล ผู้ใช้ก็เห็นอังกฤษอยู่ดี
//
//   pnpm i18n:scan-api                   รายงานทั้ง apps/api แยกตามงานในแผน
//   pnpm i18n:scan-api --task 3.5        เฉพาะ flow ของงานนั้น (3.5 / 3.6 / 3.7 / 3.8 / 3.9)
//   pnpm i18n:scan-api --show            แสดงข้อความไทยที่เจอในแต่ละจุด (ใช้เป็น worklist ตอนแก้)
//   pnpm i18n:scan-api --top 40          จำนวนไฟล์ที่แสดง (default 20, --top all = ทั้งหมด)
//   pnpm i18n:scan-api --json out.json   เขียนผลเป็น JSON ไว้เทียบ baseline
//   pnpm i18n:scan-api --max 0           exit 1 ถ้าเกินเพดาน (ใช้ใน CI · ตรวจรับ Phase 3 ต้องได้ 0)
//   pnpm i18n:scan-api --max 0 --max-untranslated 0   บังคับทั้งสองด่าน
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, parseArgs } from './i18n-lib.mjs'

const API_DIR = 'apps/api'
const SKIP_DIRS = new Set(['bin', 'obj', 'Migrations'])
// test ไม่นับ — ข้อความไทยใน assertion ไม่ได้ไปถึงผู้ใช้ (แต่ต้องแก้ตามเวลาเปลี่ยน message ที่ต้นทาง)
const SKIP_PROJECTS = new Set(['Hrms.Application.Tests'])

const THAI_RUN = /[฀-๿][฀-๿\s.,!?()/\-–—0-9%]*/g

// งานในแผน `docs/i18n-multilanguage-plan.md` ที่เป็นเจ้าของแต่ละ flow — ให้รายงานบอกได้เลยว่าจุดที่เหลือเป็นของใคร
const TASKS = [
  { id: '3.5', label: 'ลา / OT / ลงเวลา', features: ['Leaves', 'OtRequests', 'Attendance'] },
  { id: '3.6', label: 'Ticket', features: ['Tickets', 'TicketRouting', 'ExternalTickets'] },
  { id: '3.7', label: 'Memo', features: ['Memos', 'MemoReports'] },
  {
    id: '3.8',
    label: 'เบิกค่าใช้จ่าย / รอบวางบิล',
    features: ['Expenses', 'ExpenseBillingBatches'],
    // 2 handler นี้อยู่ใต้ Infrastructure/Services ไม่ได้อยู่ใต้ Features/Expenses — พลาดง่ายเวลาไล่ตามโฟลเดอร์
    files: ['ExportExpenseClaimsExcelHandler.cs', 'ExportExpenseBillingBatchExcelHandler.cs'],
  },
  { id: '3.9', label: 'master data / org / auth / upload', features: [] }, // ที่เหลือทั้งหมด
]
const FALLBACK_TASK = '3.9'

/** ชนิดของจุดที่ทำให้ข้อความหลุดไปหาผู้ใช้ — แยกไว้เพราะวิธีแก้ต่างกัน */
const KINDS = [
  { kind: 'throw', label: 'throw exception', pattern: /\bthrow\s+new\s+[A-Za-z_][\w.]*\s*\(/g },
  {
    kind: 'return',
    label: 'return จาก controller',
    pattern: /\b(?:return\s+(?:Results\.)?|Results\.)(?:BadRequest|Conflict|NotFound|Unauthorized|Forbid|UnprocessableEntity|StatusCode|Problem|ValidationProblem)\s*\(/g,
  },
  { kind: 'validator', label: 'FluentValidation', pattern: /\.With(?:Message|ErrorCode)\s*\(/g },
  // เขียน body เองโดยไม่ผ่าน controller/middleware — JwtBearerEvents กับ rate limiter ใน Program.cs
  // ไม่ได้ขึ้นต้นด้วย throw หรือ return จึงหลุดทุกด่านที่ไล่ตาม 2 คำนั้น
  { kind: 'response', label: 'เขียน response เอง', pattern: /\bWriteAs(?:JsonAsync|ync)\s*\(/g, requires: /\b(?:error|message)\s*=/ },
]

/** code ที่ส่งกลับไปให้ frontend แปล — SCREAMING_SNAKE ในสตริง (ยาว 5+ กัน "GET"/"UTC" ติดมาด้วย) */
const CODE_LITERAL = /"([A-Z][A-Z0-9_]{4,})"/g
/** `error = "CODE"` ใน object ที่ controller/Program.cs ประกอบเอง */
const ERROR_FIELD = /\berror\s*[=:]\s*"([A-Z][A-Z0-9_]{4,})"/g
/** `.WithErrorCode("CODE")` ของ FluentValidation */
const ERROR_CODE_CALL = /\.WithErrorCode\s*\(\s*"([A-Z][A-Z0-9_]{4,})"/g
// ไฟล์ที่ประกาศ code เองโดยไม่ได้อยู่ในคำสั่ง throw/return (switch ของ middleware) — อ่านทั้งไฟล์
const CODE_SOURCE_FILES = new Set(['GlobalExceptionMiddleware.cs'])

/**
 * exception ที่ **พก code ไปถึงผู้ใช้จริง** = ชนิดที่สืบทอด `AppException` เท่านั้น
 *
 * `InvalidOperationException("TICKET_ACTOR_EXACTLY_ONE_REQUIRED")` ใน DbContext หน้าตาเหมือน code
 * แต่ middleware ยุบเป็น 500 `INTERNAL_ERROR` — เป็น guard ของ developer ไม่ใช่ข้อความที่ต้องแปล
 * (เช็คจากสายสืบทอดจริงในโค้ด ไม่ hardcode รายชื่อ เพราะชนิดใหม่เพิ่มได้เรื่อย ๆ)
 */
async function codeCarryingExceptions(files) {
  const parent = new Map()
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/\bclass\s+(\w+)\b([^{;]*)/g)) {
      const base = /:\s*([A-Za-z_]\w*)/.exec(match[2])
      if (base) parent.set(match[1], base[1])
    }
  }
  const carries = new Set(['AppException'])
  let changed = true
  while (changed) {
    changed = false
    for (const [child, base] of parent) {
      if (!carries.has(child) && carries.has(base)) {
        carries.add(child)
        changed = true
      }
    }
  }
  return carries
}

async function* walk(dir, depth = 0) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      if (depth === 0 && SKIP_PROJECTS.has(entry.name)) continue
      yield* walk(path.join(dir, entry.name), depth + 1)
    } else if (entry.name.endsWith('.cs')) {
      yield path.join(dir, entry.name)
    }
  }
}

/**
 * แทน comment ด้วยช่องว่าง (คงจำนวนตัวอักษรไว้ให้ index ตรงกับไฟล์จริง)
 *
 * comment ภาษาไทยเป็นเรื่องปกติของโปรเจกต์นี้ ไม่ใช่ข้อความที่ผู้ใช้เห็น จึงต้องตัดก่อนนับ
 * ต้องเดินทีละตัวอักษรเพราะ `//` ในสตริง (URL) และ `"` ใน comment มีจริงทั้งคู่ —
 * regex เดี่ยว ๆ ตัดผิดแล้วจะกินสตริงข้าง ๆ ไปด้วย · รองรับ `@"…"` `$"…"` และ raw string `"""…"""`
 */
function stripComments(source) {
  const out = source.split('')
  const blank = (from, to) => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' '
  }
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (char === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i)
      blank(i, end === -1 ? source.length : end)
      i = end === -1 ? source.length : end
    } else if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? source.length : end + 2
      blank(i, stop)
      i = stop
    } else if (char === '"' || char === '\'') {
      i = skipLiteral(source, i)
    } else {
      i++
    }
  }
  return out.join('')
}

/** คืน index ถัดจากสตริง/ตัวอักษรที่เริ่มที่ `start` (จัดการ verbatim, interpolated, raw string, escape) */
function skipLiteral(source, start) {
  const quote = source[start]
  const verbatim = start > 0 && /[@$]/.test(source[start - 1])
  if (quote === '"' && source.startsWith('"""', start)) {
    const fence = /^"+/.exec(source.slice(start))[0]
    const end = source.indexOf(fence, start + fence.length)
    return end === -1 ? source.length : end + fence.length
  }
  let i = start + 1
  while (i < source.length) {
    if (verbatim && quote === '"') {
      if (source[i] === '"') return source[i + 1] === '"' ? (i += 2) : i + 1
      i++
      continue
    }
    if (source[i] === '\\') i += 2
    else if (source[i] === quote) return i + 1
    else if (source[i] === '\n') return i // สตริงปกติไม่ข้ามบรรทัด — กันหลุดยาวถ้าเจอโค้ดแปลก ๆ
    else i++
  }
  return source.length
}

/**
 * ตัดตั้งแต่ index ที่ match ไปจนจบ statement
 *
 * ⚠️ ต้องอ่านทั้ง statement จนถึง `;` ไม่ใช่ทีละบรรทัด — ตอนทำงาน 3.6 การนับแบบบรรทัดเดียว
 * พลาด throw ที่ขึ้นบรรทัดใหม่ไป 19 จุด (เช่น `throw new ConflictException(` แล้วข้อความอยู่บรรทัดถัดไป)
 */
function statementAt(source, start) {
  let depth = 0
  for (let i = start; i < source.length; i++) {
    const char = source[i]
    if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') {
      depth--
      if (depth <= 0) {
        // validator ต่อ `.WithMessage(...).WithErrorCode(...)` กันยาว — จบที่วงเล็บปิดของตัวเองพอ
        const semicolon = source.indexOf(';', i)
        return source.slice(start, semicolon === -1 || semicolon - i > 400 ? i + 1 : semicolon + 1)
      }
    } else if (char === ';' && depth === 0) return source.slice(start, i + 1)
  }
  return source.slice(start)
}

function taskOf(relativePath) {
  const base = path.basename(relativePath)
  for (const task of TASKS) {
    if (task.files?.includes(base)) return task.id
    if (task.features.some((feature) => relativePath.includes(`/Features/${feature}/`))) return task.id
    // controller/handler ที่ตั้งชื่อตาม feature แต่ไม่ได้อยู่ใต้โฟลเดอร์นั้น (เช่น LeaveBalanceController)
    if (task.features.some((feature) => base.startsWith(feature.replace(/s$/, '')))) return task.id
  }
  return FALLBACK_TASK
}

async function scanFile(file, carriesCode) {
  const source = stripComments(await readFile(file, 'utf8'))
  const relative = path.relative(ROOT, file).replace(/\\/g, '/')
  const lineStarts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (index) => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (lineStarts[mid] <= index) low = mid
      else high = mid - 1
    }
    return low + 1
  }

  const hits = []
  const codes = new Set()
  const seen = new Set()
  const collect = (text, pattern) => {
    for (const [, code] of text.matchAll(pattern)) codes.add(code)
  }
  if (CODE_SOURCE_FILES.has(path.basename(relative))) collect(source, CODE_LITERAL)
  // exception ที่ฝัง code ไว้ในตัวเอง (`class ExternalServiceTimeoutException() : AppException(504, "…", "…")`)
  // จุด throw ไม่มี code ให้เห็น ต้องเก็บจากตรงประกาศคลาส
  for (const match of source.matchAll(/\bclass\s+(\w+)\b([^{;]*)/g)) {
    if (carriesCode.has(match[1])) collect(match[2], CODE_LITERAL)
  }

  for (const { kind, pattern, requires } of KINDS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const statement = statementAt(source, match.index)
      if (requires && !requires.test(statement)) continue
      // code มาจาก 3 ทางเท่านั้น: exception ที่พก code, `.WithErrorCode()`, และ `error = "…"` ที่ประกอบเอง
      const thrown = /\bthrow\s+new\s+([A-Za-z_][\w.]*)\s*\(/.exec(statement)
      if (thrown && carriesCode.has(thrown[1].split('.').pop())) collect(statement, CODE_LITERAL)
      collect(statement, ERROR_CODE_CALL)
      collect(statement, ERROR_FIELD)
      const thai = statement.match(THAI_RUN)
      if (!thai) continue
      const line = lineOf(match.index)
      // throw ที่ซ้อนใน return (เช่น `return x ?? throw …`) จะ match 2 ครั้ง — นับจุดเดียว
      const key = `${line}:${thai[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({ line, kind, texts: thai.map((text) => text.trim()).filter(Boolean) })
    }
  }
  hits.sort((a, b) => a.line - b.line)
  return { file: relative, task: taskOf(relative), hits, codes: [...codes].sort() }
}

const args = parseArgs(process.argv.slice(2))
const top = args.top === 'all' ? Infinity : Number(args.top ?? 20)

const sources = []
for await (const file of walk(path.join(ROOT, API_DIR))) sources.push(file)
const carriesCode = await codeCarryingExceptions(sources)

const scanned = []
for (const file of sources) scanned.push(await scanFile(file, carriesCode))

const inTask = args.task ? scanned.filter((item) => item.task === String(args.task)) : scanned
const selected = inTask.filter((item) => item.hits.length > 0)
selected.sort((a, b) => b.hits.length - a.hits.length || a.file.localeCompare(b.file))

// ── ด่านที่ 2: code ที่ส่งได้จริงต้องมีคำแปลครบทั้ง th และ en ───────────────────
const catalog = {}
for (const locale of ['th', 'en']) {
  const file = path.join(ROOT, 'packages', 'i18n', 'messages', locale, 'errors.json')
  catalog[locale] = new Set(Object.keys(JSON.parse(await readFile(file, 'utf8'))))
}
const codeOwners = new Map()
for (const item of inTask) {
  for (const code of item.codes) {
    if (!codeOwners.has(code)) codeOwners.set(code, [])
    codeOwners.get(code).push(item.file)
  }
}
// คีย์ในแคตตาล็อกที่ไม่มีเส้นทางไหนส่งแล้ว — เหลือค้างตอนแตก code ที่กว้างเกินไป (งาน 3.6/3.7)
// แจ้งเฉย ๆ ไม่ใช่ตัวตัดสิน: frontend อาจตั้ง code เองบางตัว (เช่น เน็ตหลุด) ที่ API ไม่เคยส่ง
const unused = args.task ? [] : [...catalog.th].filter((code) => !codeOwners.has(code)).sort()

const untranslated = [...codeOwners.entries()]
  .filter(([code]) => !catalog.th.has(code) || !catalog.en.has(code))
  .map(([code, owners]) => ({
    code,
    missing: ['th', 'en'].filter((locale) => !catalog[locale].has(code)),
    files: owners,
  }))
  .sort((a, b) => a.code.localeCompare(b.code))

const total = selected.reduce((sum, item) => sum + item.hits.length, 0)
const byTask = TASKS.map((task) => {
  const items = selected.filter((item) => item.task === task.id)
  return { ...task, files: items.length, hits: items.reduce((sum, item) => sum + item.hits.length, 0) }
})
const byKind = KINDS.map(({ kind, label }) => ({
  kind,
  label,
  hits: selected.reduce((sum, item) => sum + item.hits.filter((hit) => hit.kind === kind).length, 0),
}))

console.log(`\n${API_DIR} — throw/return error ที่ยังมีข้อความไทย ${total} จุด · ${selected.length} ไฟล์`)

if (!args.task) {
  console.log('\n  งานในแผน                              จุด   ไฟล์')
  for (const task of byTask) {
    const mark = task.hits === 0 ? '✅' : '⬜'
    const name = `${task.id} ${task.label}`.padEnd(36)
    console.log(`  ${mark} ${name}${String(task.hits).padStart(4)}  ${String(task.files).padStart(4)}`)
  }
}
if (total > 0) {
  console.log(`\n  ${byKind.filter((item) => item.hits > 0).map((item) => `${item.label}: ${item.hits}`).join(' · ')}`)
  console.log('')
  for (const item of selected.slice(0, top)) {
    console.log(`  ${String(item.hits.length).padStart(4)}  [${item.task}] ${item.file}`)
    if (!args.show) continue
    for (const hit of item.hits) console.log(`          :${hit.line}  ${hit.texts.join(' / ').slice(0, 110)}`)
  }
  if (selected.length > top) console.log(`  … อีก ${selected.length - top} ไฟล์ (ใช้ --top all เพื่อดูทั้งหมด)`)
}

console.log(`\ncode ที่ API ส่งได้ ${codeOwners.size} ตัว · ไม่มีคำแปล ${untranslated.length} ตัว`)
for (const item of untranslated) {
  console.log(`  ${item.code}  (ขาด ${item.missing.join('+')})  ← ${item.files[0]}${item.files.length > 1 ? ` +${item.files.length - 1}` : ''}`)
}
if (untranslated.length > 0) {
  console.log('  → เพิ่มคีย์ที่ packages/i18n/messages/{th,en}/errors.json ไม่งั้นผู้ใช้จะเห็น message อังกฤษจาก server')
}
if (unused.length > 0) {
  console.log(`\nคีย์ใน errors.json ที่ API ไม่เคยส่ง ${unused.length} ตัว (frontend อาจใช้เอง — ตรวจก่อนลบ)`)
  console.log(`  ${unused.join(' · ')}`)
}

if (args.json) {
  const target = path.resolve(ROOT, String(args.json))
  await mkdir(path.dirname(target), { recursive: true })
  const payload = { generatedAt: new Date().toISOString(), total, byTask, byKind, files: selected, codes: codeOwners.size, untranslated }
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\nเขียนผลไว้ที่ ${path.relative(ROOT, target)}`)
}

let failed = false
if (args.max !== undefined && total > Number(args.max)) {
  console.error(`\n❌ API มีข้อความไทยที่จุด throw/return อยู่ ${total} จุด เกินเพดาน ${args.max}`)
  failed = true
}
if (args['max-untranslated'] !== undefined && untranslated.length > Number(args['max-untranslated'])) {
  console.error(`❌ มี error code ที่ไม่มีคำแปล ${untranslated.length} ตัว เกินเพดาน ${args['max-untranslated']}`)
  failed = true
}
process.exit(failed ? 1 : 0)
