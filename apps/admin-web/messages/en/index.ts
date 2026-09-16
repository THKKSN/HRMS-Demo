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

// คำแปลอังกฤษของ admin-web — คีย์ที่ขาดจะ fallback เป็นภาษาไทย (deepMergeMessages ใน i18n/request.ts)
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
