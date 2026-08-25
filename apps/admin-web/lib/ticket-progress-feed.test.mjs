import assert from 'node:assert/strict'
import test from 'node:test'

import { getTicketProgressFeedStyle } from './ticket-progress-feed.ts'

test('classifies a closed workflow step before a populated work state', () => {
  const style = getTicketProgressFeedStyle({
    workflowStepKey: 'closed',
    workState: 'ผู้ร้องขอยืนยันว่าดำเนินการเสร็จสิ้นแล้ว',
  })

  assert.equal(style.lane, 'closed')
  assert.equal(style.laneLabel, 'Closed')
  assert.equal(style.title, 'ผู้ร้องขอยืนยันว่าดำเนินการเสร็จสิ้นแล้ว')
  assert.match(style.surfaceClass, /\bbg-background\b/)
  assert.match(style.surfaceClass, /\bborder-l-emerald-500\b/)
  assert.match(style.surfaceClass, /\bdark:bg-emerald-950\/30\b/)
})

test('recognizes Closed from work state regardless of case and whitespace', () => {
  const style = getTicketProgressFeedStyle({
    workflowStepKey: 'in_progress',
    workState: '  cLoSeD  ',
  })

  assert.equal(style.lane, 'closed')
  assert.equal(style.title, 'cLoSeD')
})

test('uses neutral light surfaces and lane accents for every progress type', () => {
  const cases = [
    [{ workflowStepKey: 'working', workState: 'กำลังดำเนินการ' }, 'process', 'border-l-cyan-500', 'dark:bg-cyan-950/30'],
    [{ workflowStepKey: 'blocked', blockerReason: 'รอข้อมูล' }, 'hold', 'border-l-amber-500', 'dark:bg-amber-950/30'],
    [{ workflowStepKey: 'next', nextAction: 'ตรวจสอบงาน' }, 'waiting', 'border-l-emerald-500', 'dark:bg-emerald-950/30'],
    [{ workflowStepKey: 'assigned' }, 'activity', 'border-l-slate-400', 'dark:bg-slate-900/45'],
  ]

  for (const [entry, lane, accentClass, darkSurfaceClass] of cases) {
    const style = getTicketProgressFeedStyle(entry)

    assert.equal(style.lane, lane)
    assert.match(style.surfaceClass, /\bbg-background\b/)
    assert.match(style.surfaceClass, new RegExp(`\\b${accentClass}\\b`))
    assert.match(style.surfaceClass, new RegExp(`\\b${darkSurfaceClass.replace('/', '\\/')}\\b`))
  }
})
