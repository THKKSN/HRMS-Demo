import attendance from './attendance.json'
import auth from './auth.json'
import expense from './expense.json'
import external from './external.json'
import home from './home.json'
import leave from './leave.json'
import memo from './memo.json'
import meta from './meta.json'
import nav from './nav.json'
import ot from './ot.json'
import payslip from './payslip.json'
import profile from './profile.json'
import ticket from './ticket.json'

// messages เฉพาะ liff-web (ภาษาไทย = ต้นฉบับ) — รวมอยู่ใต้ namespace `liff` เพื่อไม่ชนกับของ admin/ส่วนกลาง
// ไฟล์ละ 1 โมดูล: ใช้ในโค้ดเป็น useTranslations('liff.<module>') · ส่วนกลาง (common/status/errors) อยู่ใน packages/i18n
const messages = {
  liff: {
    meta,
    nav,
    home,
    auth,
    attendance,
    leave,
    ot,
    expense,
    memo,
    payslip,
    profile,
    external,
    ticket,
  },
}

export default messages
