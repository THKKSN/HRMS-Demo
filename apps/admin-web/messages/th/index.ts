import approval from './approval.json'
import auth from './auth.json'
import dashboard from './dashboard.json'
import employees from './employees.json'
import layout from './layout.json'
import memo from './memo.json'
import nav from './nav.json'
import org from './org.json'
import settings from './settings.json'
import ticket from './ticket.json'

// messages เฉพาะ admin-web (ภาษาไทย = ต้นฉบับ) — รวมอยู่ใต้ namespace `admin` เพื่อไม่ชนกับของ liff/ส่วนกลาง
// ไฟล์ละ 1 โมดูล: ใช้ในโค้ดเป็น useTranslations('admin.<module>') · ส่วนกลาง (common/status/errors) อยู่ใน packages/i18n
const messages = {
  admin: {
    nav,
    approval,
    auth,
    dashboard,
    employees,
    org,
    layout,
    memo,
    settings,
    ticket,
  },
}

export default messages
