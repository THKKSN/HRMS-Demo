import common from './common.json'
import errors from './errors.json'
import status from './status.json'

// ภาษาอังกฤษ — คีย์ที่ไม่มีจะ fallback เป็นไทยผ่าน loadMessages
// namespace `status` ต้องมีคีย์ครบเท่ากับ STATUS_MESSAGES ใน src/labels.ts (ตัวสะกดตรงกับค่า enum)
const messages = {
  common,
  errors,
  status,
}

export default messages
