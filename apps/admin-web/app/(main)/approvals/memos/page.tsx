import { redirect } from 'next/navigation'

// รวมเข้าหน้า "งาน Memo" แล้ว — คง route เดิมไว้กัน bookmark/ลิงก์เก่าพัง
// (หน้า detail /approvals/memos/[id] ยังใช้งานตามเดิม)
export default function ApprovalsMemosPage() {
  redirect('/memos/tasks')
}
