import { expect, test } from '@playwright/test'

const PREVIEW_URL = 'http://api.test/v1/auth/link/preview'
const OTP_URL = 'http://api.test/v1/auth/otp/request'

test('shows full name before sending OTP and preserves next after confirmation', async ({ page }) => {
  let previewBody: unknown
  let otpBody: unknown
  await page.route(PREVIEW_URL, async route => {
    previewBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      json: { fullName: 'สมชาย ใจดี', previewToken: 'preview-token', expiresIn: 300 },
    })
  })
  await page.route(OTP_URL, async route => {
    otpBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, json: { hint: 'OTP sent' } })
  })

  await page.goto('/auth/link?next=%2Fleaves')
  await expect(page.getByLabel('รหัสพนักงาน')).toBeVisible()
  await expect(page.getByLabel('เลขบัตรประชาชน')).toHaveCount(0)
  await page.getByLabel('รหัสพนักงาน').fill('  EMP001  ')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()

  // ขั้น preview: เห็นชื่อแล้ว แต่ยังไม่ส่ง OTP
  await expect(page.getByText('สมชาย ใจดี')).toBeVisible()
  expect(previewBody).toEqual({
    accessToken: 'e2e-line-access-token',
    employeeCode: 'EMP001',
  })
  expect(otpBody).toBeUndefined()

  await page.getByRole('button', { name: 'ใช่ นี่คือฉัน' }).click()
  await expect(page).toHaveURL(/\/auth\/otp\?next=%2Fleaves$/)
  expect(otpBody).toEqual({
    accessToken: 'e2e-line-access-token',
    previewToken: 'preview-token',
  })

  // session storage ต้องมีแค่ LINE access token ไม่มีรหัสพนักงาน ชื่อ หรือ preview token
  expect(await page.evaluate(() => sessionStorage.getItem('liff_access_token')))
    .toBe('e2e-line-access-token')
  const sessionValues = await page.evaluate(() =>
    Array.from({ length: sessionStorage.length }, (_, index) => {
      const key = sessionStorage.key(index)
      return key ? sessionStorage.getItem(key) : null
    }),
  )
  expect(sessionValues).not.toContain('EMP001')
  expect(sessionValues).not.toContain('preview-token')
  expect(sessionValues).not.toContain('สมชาย ใจดี')
})

test('not-me action clears preview and returns to editable code', async ({ page }) => {
  await page.route(PREVIEW_URL, route => route.fulfill({
    status: 200,
    json: { fullName: 'ไม่ใช่ ผู้ใช้', previewToken: 'preview-token', expiresIn: 300 },
  }))
  await page.goto('/auth/link')
  await page.getByLabel('รหัสพนักงาน').fill('EMP002')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('ไม่ใช่ ผู้ใช้')).toBeVisible()

  await page.getByRole('button', { name: 'ไม่ใช่ กลับไปแก้ไข' }).click()

  await expect(page.getByLabel('รหัสพนักงาน')).toBeEditable()
  await expect(page.getByLabel('รหัสพนักงาน')).toHaveValue('')
  await expect(page.getByText('ไม่ใช่ ผู้ใช้')).toHaveCount(0)
})

test('sends leading zeros verbatim and lets the server resolve them', async ({ page }) => {
  let previewBody: unknown
  await page.route(PREVIEW_URL, async route => {
    previewBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      json: { fullName: 'สมหญิง รักงาน', previewToken: 'preview-token', expiresIn: 300 },
    })
  })
  await page.goto('/auth/link')
  await page.getByLabel('รหัสพนักงาน').fill('  00123  ')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()

  await expect(page.getByText('สมหญิง รักงาน')).toBeVisible()
  expect(previewBody).toEqual({
    accessToken: 'e2e-line-access-token',
    employeeCode: '00123',
  })
})

test('blocks empty and overlength employee codes without an API call', async ({ page }) => {
  let previewRequestCount = 0
  await page.route(PREVIEW_URL, route => {
    previewRequestCount += 1
    return route.abort()
  })
  await page.goto('/auth/link')

  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('กรุณากรอกรหัสพนักงาน')).toBeVisible()

  await page.getByLabel('รหัสพนักงาน').fill('X'.repeat(51))
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('รหัสพนักงานต้องไม่เกิน 50 ตัวอักษร')).toBeVisible()

  expect(previewRequestCount).toBe(0)
})

test('preview failure shows no stale identity', async ({ page }) => {
  await page.route(PREVIEW_URL, route => route.fulfill({
    status: 401,
    json: { error: 'EMPLOYEE_NOT_FOUND', message: 'ไม่สามารถยืนยันข้อมูลพนักงานได้' },
  }))
  await page.goto('/auth/link')
  await page.getByLabel('รหัสพนักงาน').fill('UNKNOWN')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()

  await expect(page.getByText('ไม่สามารถยืนยันข้อมูลพนักงานได้')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ใช่ นี่คือฉัน' })).toHaveCount(0)
})

test('already-linked preview preserves the recovery route', async ({ page }) => {
  await page.route(PREVIEW_URL, route => route.fulfill({
    status: 409,
    json: { error: 'ALREADY_LINKED', message: 'Account already linked' },
  }))
  await page.route('http://api.test/v1/auth/line', route => route.fulfill({
    status: 500,
    json: { message: 'หยุดการทดสอบหลังเข้าหน้ากู้คืน' },
  }))
  await page.goto('/auth/link?next=%2Fleaves')
  await page.getByLabel('รหัสพนักงาน').fill('EMP001')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()

  await expect(page).toHaveURL(/\/auth\/already-linked\?next=%2Fleaves$/)
})
