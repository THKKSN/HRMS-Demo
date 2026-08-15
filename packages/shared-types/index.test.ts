import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_TICKET_BOARD_WORKFLOW,
  getTicketBoardWorkflowStepState,
} from './index.ts'

test('marks every workflow step complete when the ticket is closed', () => {
  const states = DEFAULT_TICKET_BOARD_WORKFLOW.steps.map((_, index) => (
    getTicketBoardWorkflowStepState(
      DEFAULT_TICKET_BOARD_WORKFLOW,
      'Closed',
      index,
      'closed',
    )
  ))

  assert.deepEqual(states, [
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
  ])
})
