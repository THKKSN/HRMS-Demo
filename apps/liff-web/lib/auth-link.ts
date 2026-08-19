/**
 * ตัดช่องว่างหัวท้ายอย่างเดียว
 *
 * ห้ามเติมหรือตัด 0 นำหน้าที่ฝั่ง client — งานนั้นเป็นของ server
 * (EmployeeCodeNormalizer) ที่รู้ว่า canonical form ใน DB เป็นแบบไหน
 * ถ้า client เดาเอง สองฝั่งจะไม่ตรงกันแล้วพนักงานผูกบัญชีไม่ได้
 */
export function normalizeEmployeeCode(value: string): string {
  return value.trim()
}

/** ขั้นแรก: ขอดูชื่อพนักงานจากรหัสพนักงาน */
export function buildLinkPreviewPayload(accessToken: string, employeeCode: string) {
  return { accessToken, employeeCode: normalizeEmployeeCode(employeeCode) }
}

/** ขั้นสอง: ยืนยันว่าเป็นตัวเองแล้ว ส่งแค่ preview token ไม่ส่งรหัสพนักงานซ้ำ */
export function buildOtpRequestPayload(accessToken: string, previewToken: string) {
  return { accessToken, previewToken }
}
