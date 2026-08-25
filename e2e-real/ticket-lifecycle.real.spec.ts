import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test'

const apiUrl = 'http://localhost:5135/v1'
const password = 'Test@1234'

type AuthResult = {
  accessToken: string
  refreshToken: string
  employee: Record<string, unknown>
}

async function loginApi(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  })
  expect(response.ok(), `API login failed for ${email}: ${await response.text()}`).toBeTruthy()
  return response.json() as Promise<AuthResult>
}

async function requesterPage(browser: Browser, auth: AuthResult) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } })
  await context.addCookies([{
    name: 'hrms-access-token',
    value: auth.accessToken,
    domain: 'localhost',
    path: '/',
  }])
  await context.addInitScript(value => {
    localStorage.setItem('hrms-auth', JSON.stringify({
      state: {
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        employee: value.employee,
        isAuthenticated: true,
      },
      version: 0,
    }))
  }, auth)
  const page = await context.newPage()
  page.on('requestfailed', request => {
    console.log(`[LIFF request failed] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`)
  })
  page.on('response', response => {
    if (response.url().includes('/v1/') && response.status() >= 400) {
      console.log(`[LIFF response] ${response.status()} ${response.url()}`)
    }
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      console.log(`[LIFF console] ${message.text()}`)
    }
  })
  return { context, page }
}

async function adminPage(browser: Browser, email: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto('http://localhost:3001/login')
  await page.getByLabel('อีเมล').fill(email)
  await page.getByLabel('รหัสผ่าน').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return { context, page }
}

async function closeContexts(contexts: BrowserContext[]) {
  await Promise.allSettled(contexts.map(context => context.close()))
}

test('real Ticket flow: requester creates, supervisor assigns, worker resolves, supervisor closes', async ({
  browser,
  request,
}) => {
  const contexts: BrowserContext[] = []
  try {
    const requesterAuth = await loginApi(request, 'emp001@test.com')
    const requester = await requesterPage(browser, requesterAuth)
    contexts.push(requester.context)

    await requester.page.goto('http://localhost:3000/tickets/new')
    await expect(requester.page.getByRole('heading', { name: 'แจ้งเรื่องภายใน' })).toBeVisible()

    // บริษัทถูกเลือกอัตโนมัติและแสดงเป็น read-only จึงไม่มี select ของบริษัทในฟอร์ม
    const selects = requester.page.locator('form select')
    await selects.nth(0).selectOption({ label: 'ฝ่ายเทคโนโลยีสารสนเทศ' })
    await selects.nth(1).selectOption({ label: 'รถ / อุปกรณ์ประจำรถ' })
    await selects.nth(2).selectOption({ label: 'กล้องรถ' })
    await selects.nth(3).selectOption({ label: 'กล้องรถกาวหลุด' })
    await requester.page.getByLabel('รายละเอียด', { exact: true })
      .fill('ทดสอบ flow จริง ต้องการให้ทีม IT ตรวจสอบกล้องรถที่อู่')
    await requester.page.getByLabel('สถานที่ตั้ง').fill('อู่ทดสอบ E2E')
    await requester.page.getByLabel('รถ / อุปกรณ์').fill('E2E-BUS-01')
    await requester.page.getByRole('button', { name: 'ส่งใบแจ้งเรื่อง' }).click()

    await expect(requester.page.getByRole('heading', { name: 'ส่งใบแจ้งเรื่องแล้ว' })).toBeVisible()
    const detailLink = requester.page.getByRole('link', { name: 'ดูรายละเอียด' })
    const ticketHref = await detailLink.getAttribute('href')
    expect(ticketHref).toMatch(/^\/tickets\/[0-9a-f-]+$/i)
    const ticketId = ticketHref!.split('/').pop()!

    const supervisor = await adminPage(browser, 'emp003@test.com')
    contexts.push(supervisor.context)
    await supervisor.page.goto(`http://localhost:3001/tickets/${ticketId}`)
    await expect(supervisor.page.getByText('กล้องรถกาวหลุด')).toBeVisible()

    await supervisor.page.getByRole('button', { name: 'รับเรื่อง' }).click()
    await expect(supervisor.page.getByText('รับเรื่องแล้ว')).toBeVisible()
    await supervisor.page.getByRole('button', { name: 'มอบหมายงาน' }).click()
    await supervisor.page.locator('#assignee').selectOption({ label: /EMP002/ })
    await supervisor.page.locator('#assign-note').fill('ตรวจสอบและยึดกล้องรถให้เรียบร้อย')
    await supervisor.page.getByRole('button', { name: 'ยืนยันมอบหมาย' }).click()
    await expect(supervisor.page.getByText('มอบหมายงานแล้ว')).toBeVisible()

    const worker = await adminPage(browser, 'emp002@test.com')
    contexts.push(worker.context)
    await worker.page.goto(`http://localhost:3001/tickets/${ticketId}`)
    await worker.page.getByRole('button', { name: 'เริ่มงาน' }).click()

    const workModal = worker.page.locator('div.fixed.inset-0')
    await workModal.locator('select').selectOption('SystemDefect')
    await workModal.locator('textarea').nth(0).fill('พบกาวยึดกล้องเสื่อมสภาพ')
    await worker.page.getByRole('button', { name: 'เริ่มดำเนินการ' }).click()
    await expect(worker.page.getByText('ข้อมูลหลังดำเนินการ')).toBeVisible()

    await workModal.locator('textarea').nth(1)
      .fill('ทำความสะอาดพื้นผิวและเปลี่ยนกาวยึดกล้องใหม่แล้ว')
    await workModal.locator('input[type=file]').last()
      .setInputFiles('apps/admin-web/public/logo.png')
    await expect(worker.page.getByText('เพิ่มหลักฐานแล้ว')).toBeVisible()
    await worker.page.getByRole('button', { name: 'ส่งตรวจรับ' }).click()
    await expect(worker.page.getByText('ส่งงานให้ตรวจรับแล้ว')).toBeVisible()

    await supervisor.page.reload()
    await expect(supervisor.page.getByRole('button', { name: 'ตรวจผ่านและปิดงาน' })).toBeVisible()
    await supervisor.page.getByRole('button', { name: 'ตรวจผ่านและปิดงาน' }).click()
    await supervisor.page.locator('div.fixed.inset-0 textarea').fill('ตรวจหลักฐานแล้ว งานเรียบร้อย')
    await supervisor.page.getByRole('button', { name: 'ยืนยันปิดงาน' }).click()
    await expect(supervisor.page.getByText('ตรวจผ่านและปิดงานแล้ว')).toBeVisible()
    await expect(supervisor.page.getByText('ปิดแล้ว').first()).toBeVisible()

    await requester.page.goto(`http://localhost:3000/tickets/${ticketId}`)
    await expect(requester.page.getByText('ปิดแล้ว').first()).toBeVisible()
    await expect(requester.page.getByText('ทำความสะอาดพื้นผิวและเปลี่ยนกาวยึดกล้องใหม่แล้ว')).toBeVisible()
  } finally {
    await closeContexts(contexts)
  }
})
