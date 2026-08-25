import assert from 'node:assert/strict'
import test from 'node:test'

import * as ticketStatus from './ticket-status.ts'

const EXPECTED_TONE = {
  AwaitingRequesterConfirmation: 'violet',
  Open: 'sky',
  Assigned: 'indigo',
  InProgress: 'blue',
  WaitingInfo: 'amber',
  Resolved: 'cyan',
  Closed: 'emerald',
  Rejected: 'red',
  Cancelled: 'zinc',
}

test('defines a distinct dark-compatible color for every ticket status', () => {
  const classes = ticketStatus.TICKET_STATUS_CLASS

  assert.ok(classes, 'TICKET_STATUS_CLASS must be exported')
  for (const [status, tone] of Object.entries(EXPECTED_TONE)) {
    assert.match(classes[status], new RegExp(`(?:border|bg)-${tone}-`), status)
    assert.match(classes[status], /dark:/, `${status} must support dark theme`)
  }
  assert.equal(new Set(Object.values(classes)).size, 9)
})
