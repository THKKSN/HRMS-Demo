import { STATUS_MESSAGES } from '../../src/labels.ts'
import common from './common.json'
import errors from './errors.json'

// messages ภาษาไทย (ต้นฉบับ) ส่วนกลางที่ทั้ง LIFF และ Admin ใช้ร่วมกัน
// - `status` มาจาก src/labels.ts (source เดียวกับ label map เดิม) — ภาษาอื่นแปลเป็น messages/<locale>/status.json
// - `errors` = ข้อความตาม error code ของ API (คีย์สะกดตรงกับ code เช่น errors.OVERLAPPING_LEAVE)
const messages = {
  common,
  errors,
  status: STATUS_MESSAGES,
}

export default messages
