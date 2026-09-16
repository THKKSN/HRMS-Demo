// สแกนหาข้อความภาษาไทยที่ยังฝังอยู่ในโค้ด UI (ไม่นับ comment) — ใช้เป็น checklist ระหว่างแปล และเป็น gate ตอนจบเฟส
//
//   pnpm i18n:scan                       รายงานทั้งสองแอป
//   pnpm i18n:scan --app liff            เฉพาะ liff-web (หรือ admin)
//   pnpm i18n:scan --top 30              แสดง 30 ไฟล์แรกที่มีมากสุด (default 20, --top all = ทั้งหมด)
//   pnpm i18n:scan --json out.json       เขียนผลเป็น JSON ไว้เทียบ baseline
//   pnpm i18n:scan --max-liff 0 --max-admin 0   exit 1 ถ้าเกินเพดาน (ใช้ใน CI)
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, parseArgs } from './i18n-lib.mjs'

const APPS = {
  liff: 'apps/liff-web',
  admin: 'apps/admin-web',
}
const SKIP_DIRS = new Set(['node_modules', '.next', 'public'])
const THAI_RUN = /[฀-๿][฀-๿\s.,!?()/\-–—0-9%]*/g

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(path.join(dir, entry.name))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      yield path.join(dir, entry.name)
    }
  }
}

// ตัด comment ออกก่อนนับ — comment ภาษาไทยเป็นเรื่องปกติของโปรเจกต์นี้ ไม่ใช่ข้อความที่ผู้ใช้เห็น
// (ตัดแบบง่าย: ไม่สน // ที่อยู่ในสตริง เช่น URL — ข้อความไทยหลัง URL ในสตริงเดียวกันแทบไม่มี)
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (_, lead) => lead)
}

async function scanApp(appDir) {
  const files = []
  for await (const file of walk(path.join(ROOT, appDir))) {
    const source = stripComments(await readFile(file, 'utf8'))
    let lines = 0
    let runs = 0
    for (const line of source.split('\n')) {
      const matches = line.match(THAI_RUN)
      if (!matches) continue
      lines++
      runs += matches.length
    }
    if (lines > 0) files.push({ file: path.relative(ROOT, file).replace(/\\/g, '/'), lines, runs })
  }
  files.sort((a, b) => b.runs - a.runs || a.file.localeCompare(b.file))
  return {
    app: appDir,
    files: files.length,
    lines: files.reduce((sum, item) => sum + item.lines, 0),
    runs: files.reduce((sum, item) => sum + item.runs, 0),
    items: files,
  }
}

const args = parseArgs(process.argv.slice(2))
const selected = args.app ? [args.app] : Object.keys(APPS)
const top = args.top === 'all' ? Infinity : Number(args.top ?? 20)

const results = []
for (const key of selected) {
  if (!APPS[key]) {
    console.error(`ไม่รู้จักแอป "${key}" — ใช้ liff หรือ admin`)
    process.exit(2)
  }
  results.push({ key, ...(await scanApp(APPS[key])) })
}

for (const result of results) {
  console.log(`\n${result.app} — ไฟล์ที่มีข้อความไทย ${result.files} ไฟล์ · ${result.lines} บรรทัด · ${result.runs} จุด`)
  for (const item of result.items.slice(0, top)) {
    console.log(`  ${String(item.runs).padStart(4)}  ${item.file}`)
  }
  if (result.items.length > top) console.log(`  … อีก ${result.items.length - top} ไฟล์ (ใช้ --top all เพื่อดูทั้งหมด)`)
}

if (args.json) {
  const target = path.resolve(ROOT, String(args.json))
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8')
  console.log(`\nเขียนผลไว้ที่ ${path.relative(ROOT, target)}`)
}

let failed = false
for (const result of results) {
  const limit = args[`max-${result.key}`]
  if (limit === undefined) continue
  if (result.runs > Number(limit)) {
    console.error(`\n❌ ${result.app} มีข้อความไทยฝังอยู่ ${result.runs} จุด เกินเพดาน ${limit}`)
    failed = true
  }
}
process.exit(failed ? 1 : 0)
