import { expect, test, type Page } from '@playwright/test'

const ids = {
  company: '10000000-0000-0000-0000-000000000001',
  sourceDepartment: '20000000-0000-0000-0000-000000000001',
  targetDepartment: '20000000-0000-0000-0000-000000000002',
  requester: '30000000-0000-0000-0000-000000000001',
  category: '40000000-0000-0000-0000-000000000001',
  topic: '50000000-0000-0000-0000-000000000001',
  subject: '51000000-0000-0000-0000-000000000001',
  ticket: '60000000-0000-0000-0000-000000000001',
}

async function mockTicketApi(page: Page) {
  await page.route('http://api.test/v1/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: ids.requester } })
    if (path.endsWith('/employees/me')) {
      return route.fulfill({
        json: {
          id: ids.requester,
          employeeCode: 'EMP001',
          firstName: 'นาย A',
          lastName: 'คนขับรถ',
          phone: '0812345678',
          companyId: ids.company,
          departmentId: ids.sourceDepartment,
        },
      })
    }
    if (path.endsWith('/ticket-lookups/companies')) {
      return route.fulfill({ json: [{ id: ids.company, name: 'บริษัททดสอบ' }] })
    }
    if (path.endsWith('/ticket-lookups/departments')) {
      return route.fulfill({
        json: [{
          id: ids.targetDepartment,
          companyId: ids.company,
          name: 'เทคโนโลยีสารสนเทศ',
        }],
      })
    }
    if (path.endsWith('/ticket-categories')) {
      return route.fulfill({
        json: [{
          id: ids.category,
          companyId: ids.company,
          departmentId: ids.targetDepartment,
          name: 'ฮาร์ดแวร์',
          isActive: true,
        }],
      })
    }
    if (path.endsWith('/ticket-topics')) {
      return route.fulfill({
        json: [{
          id: ids.topic,
          companyId: ids.company,
          departmentId: ids.targetDepartment,
          categoryId: ids.category,
          name: 'กล้องติดรถ',
          isActive: true,
        }],
      })
    }
    if (path.endsWith('/ticket-subjects')) {
      return route.fulfill({
        json: [{
          id: ids.subject,
          companyId: ids.company,
          departmentId: ids.targetDepartment,
          categoryId: ids.category,
          topicId: ids.topic,
          name: 'กล้องรถกาวหลุด',
          isActive: true,
        }],
      })
    }
    if (path.endsWith('/tickets') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.subjectId).toBe(ids.subject)
      expect(body.title).toBeUndefined()
      return route.fulfill({
        json: {
          id: ids.ticket,
          ticketNo: 'TK-20260727-0001',
          status: 'Open',
          routingResult: {
            mode: 'SupervisorAssign',
            level: 'None',
            outcome: 'NoMatch',
          },
        },
      })
    }
    return route.fulfill({ status: 404, json: { message: `Unhandled ${path}` } })
  })
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{
    name: 'hrms-access-token',
    value: 'e2e-access-token',
    domain: 'localhost',
    path: '/',
  }])
  await page.addInitScript(({ fixtureIds }) => {
    localStorage.setItem('hrms-auth', JSON.stringify({
      state: {
        accessToken: 'e2e-access-token',
        refreshToken: 'e2e-refresh-token',
        isAuthenticated: true,
        employee: {
          id: fixtureIds.requester,
          employeeCode: 'EMP001',
          firstName: 'นาย A',
          lastName: 'คนขับรถ',
          companyId: fixtureIds.company,
          departmentId: fixtureIds.sourceDepartment,
          roles: [{ role: 'Employee', companyId: fixtureIds.company }],
        },
      },
      version: 0,
    }))
  }, { fixtureIds: ids })
  await mockTicketApi(page)
})

test('LIFF requester can create an internal ticket without horizontal overflow', async ({ page }) => {
  await page.goto('/tickets/new')

  await expect(page.getByRole('heading', { name: 'แจ้งเรื่องภายใน' })).toBeVisible()
  // บริษัทถูกเลือกอัตโนมัติและแสดงเป็น read-only จึงไม่มี select ของบริษัทในฟอร์ม
  await expect(page.getByText('บริษัททดสอบ')).toBeVisible()
  const selects = page.locator('form select')
  await selects.nth(0).selectOption(ids.targetDepartment)
  await selects.nth(1).selectOption(ids.category)
  await selects.nth(2).selectOption(ids.topic)
  await selects.nth(3).selectOption(ids.subject)
  await page.getByLabel('รายละเอียด', { exact: true })
    .fill('กาวยึดกล้องหลุด ต้องการให้ทีม IT ตรวจสอบที่อู่')
  await page.getByLabel('สถานที่ตั้ง').fill('อู่หลัก')
  await page.getByLabel('รถ / อุปกรณ์').fill('BUS-01')

  const bodyFitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth)
  expect(bodyFitsViewport).toBe(true)

  await page.getByRole('button', { name: 'ส่งใบแจ้งเรื่อง' }).click()

  await expect(page.getByRole('heading', { name: 'ส่งใบแจ้งเรื่องแล้ว' })).toBeVisible()
  await expect(page.getByText('TK-20260727-0001')).toBeVisible()
  await expect(page.getByText('ส่งเรื่องแล้ว การยกเลิกต้องได้รับอนุมัติ')).toBeVisible()
})
