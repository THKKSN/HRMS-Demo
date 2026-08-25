import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const ticketId = '60000000-0000-0000-0000-000000000001'
const employeeId = '30000000-0000-0000-0000-000000000001'
const now = '2026-08-13T02:30:00.000Z'

const actions = {
  isRequester: false,
  isReceiverSide: true,
  canAccept: false,
  canTriage: false,
  canAssign: false,
  canReject: false,
  canStart: false,
  canEditWorkDetail: false,
  canRequestInfo: false,
  canResume: false,
  canResolve: false,
  canComment: false,
  canAddInternalNote: false,
  canAddAttachment: false,
  canAddWorkAttachment: false,
  canReturnForRevision: false,
  canClose: false,
  canViewTicketReport: false,
  canClaim: false,
  canRequestCancellation: false,
}

const ticket = {
  id: ticketId,
  ticketNo: 'TK-20260813-0001',
  requestType: 'Internal',
  status: 'Closed',
  priority: 'Medium',
  requesterEmployeeId: employeeId,
  requesterName: 'ผู้แจ้งทดสอบ',
  sourceCompanyId: '10000000-0000-0000-0000-000000000001',
  sourceCompanyName: 'บริษัททดสอบ',
  sourceDepartmentId: '20000000-0000-0000-0000-000000000001',
  sourceDepartmentName: 'ปฏิบัติการ',
  targetCompanyId: '10000000-0000-0000-0000-000000000001',
  targetCompanyName: 'บริษัททดสอบ',
  targetDepartmentId: '20000000-0000-0000-0000-000000000002',
  targetDepartmentName: 'เทคโนโลยีสารสนเทศ',
  categoryId: '40000000-0000-0000-0000-000000000001',
  categoryName: 'Software',
  topicId: '50000000-0000-0000-0000-000000000001',
  topicName: 'ระบบงาน',
  title: 'ตรวจสอบ Progress Feed Theme',
  detail: 'ข้อมูลสำหรับตรวจสอบหน้าจอ',
  workflowBoardSteps: [],
  workflowInProgressPresets: [],
  workflowActions: [],
  workflowSteps: [],
  workflowCurrentStepIndexByStatus: {},
  workflowCurrentStepKey: 'closed',
  progressEntries: [
    {
      id: 'closed-entry',
      workflowStepKey: 'closed',
      workState: 'ผู้ร้องขอยืนยันว่าดำเนินการเสร็จสิ้นแล้ว',
      isCompleted: true,
      note: 'ปิดงานเรียบร้อย',
      createdByEmployeeId: employeeId,
      createdByEmployeeName: 'ผู้ดูแลระบบ',
      createdAt: now,
      attachments: [],
    },
    {
      id: 'process-entry',
      workflowStepKey: 'in_progress',
      workState: 'ตรวจสอบและแก้ไขข้อมูล',
      isCompleted: false,
      note: 'กำลังดำเนินงาน',
      createdByEmployeeId: employeeId,
      createdByEmployeeName: 'ผู้ดูแลระบบ',
      createdAt: '2026-08-13T02:20:00.000Z',
      attachments: [],
    },
    {
      id: 'hold-entry',
      workflowStepKey: 'in_progress',
      blockerReason: 'รอข้อมูลจากผู้แจ้ง',
      isCompleted: false,
      createdByEmployeeId: employeeId,
      createdByEmployeeName: 'ผู้ดูแลระบบ',
      createdAt: '2026-08-13T02:10:00.000Z',
      attachments: [],
    },
  ],
  attachments: [],
  auditEvents: [],
  actions,
  createdAt: '2026-08-13T01:00:00.000Z',
  updatedAt: now,
}

async function preparePage(page, role) {
  await page.addInitScript(({ employeeId, role }) => {
    localStorage.setItem('hrms-auth', JSON.stringify({
      state: {
        accessToken: 'verification-token',
        refreshToken: 'verification-refresh-token',
        isAuthenticated: true,
        employee: {
          id: employeeId,
          employeeCode: 'EMP001',
          firstName: 'ผู้ดูแล',
          lastName: 'ระบบ',
          companyId: '10000000-0000-0000-0000-000000000001',
          departmentId: '20000000-0000-0000-0000-000000000002',
          roles: [{ role, companyId: '10000000-0000-0000-0000-000000000001' }],
        },
      },
      version: 0,
    }))
  }, { employeeId, role })

  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url())
    const isTicketDetail = new RegExp(`/tickets/${ticketId}/?$`).test(url.pathname)

    if (isTicketDetail && route.request().method() === 'GET') {
      return route.fulfill({ json: ticket })
    }
    if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/employees/me')) {
      return route.fulfill({ json: { id: employeeId } })
    }
    return route.fulfill({ json: [] })
  })
}

async function verifySurface(page, expectedDark) {
  const closed = page.locator('[data-progress-lane="closed"]')
  await closed.waitFor({ state: 'visible' })
  await page.getByText('Closed', { exact: true }).first().waitFor({ state: 'visible' })
  assert.equal(await page.locator('[data-progress-lane="process"]').count(), 1)
  assert.equal(await page.locator('[data-progress-lane="hold"]').count(), 1)

  const style = await closed.evaluate(element => {
    const computed = getComputedStyle(element)
    return {
      backgroundColor: computed.backgroundColor,
      borderLeftColor: computed.borderLeftColor,
      borderLeftWidth: computed.borderLeftWidth,
      className: element.className,
    }
  })

  assert.match(style.className, /bg-background/)
  assert.match(style.className, /border-l-emerald-500/)
  assert.equal(style.borderLeftWidth, '4px')
  if (expectedDark) {
    assert.notEqual(style.backgroundColor, 'rgb(255, 255, 255)')
  } else {
    assert.equal(style.backgroundColor, 'rgb(255, 255, 255)')
  }

  return style
}

const browser = await chromium.launch()
try {
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
  const adminPage = await adminContext.newPage()
  await preparePage(adminPage, 'Supervisor')
  await adminPage.goto(`http://localhost:3001/tickets/${ticketId}`)
  const adminLight = await verifySurface(adminPage, false)
  await adminPage.screenshot({ path: 'test-results/progress-feed-admin-light.png', fullPage: true })
  await adminPage.evaluate(() => document.documentElement.classList.add('dark'))
  const adminDark = await verifySurface(adminPage, true)
  await adminPage.screenshot({ path: 'test-results/progress-feed-admin-dark.png', fullPage: true })
  await adminContext.close()

  const liffLightContext = await browser.newContext({ viewport: { width: 430, height: 932 }, colorScheme: 'light' })
  const liffLightPage = await liffLightContext.newPage()
  await preparePage(liffLightPage, 'Employee')
  await liffLightPage.goto(`http://localhost:3000/tickets/${ticketId}`)
  const liffLight = await verifySurface(liffLightPage, false)
  await liffLightPage.screenshot({ path: 'test-results/progress-feed-liff-light.png', fullPage: true })
  await liffLightContext.close()

  const liffDarkContext = await browser.newContext({ viewport: { width: 430, height: 932 }, colorScheme: 'dark' })
  const liffDarkPage = await liffDarkContext.newPage()
  await preparePage(liffDarkPage, 'Employee')
  await liffDarkPage.goto(`http://localhost:3000/tickets/${ticketId}`)
  const liffDark = await verifySurface(liffDarkPage, true)
  await liffDarkPage.screenshot({ path: 'test-results/progress-feed-liff-dark.png', fullPage: true })
  await liffDarkContext.close()

  process.stdout.write(`${JSON.stringify({ adminLight, adminDark, liffLight, liffDark }, null, 2)}\n`)
} finally {
  await browser.close()
}
