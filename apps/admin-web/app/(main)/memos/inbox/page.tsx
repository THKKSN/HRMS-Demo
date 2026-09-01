import { redirect } from 'next/navigation'

// รวมเข้าหน้า "งาน Memo" แล้ว — คง route เดิมไว้กัน bookmark/ลิงก์เก่าพัง
export default function MemoInboxPage() {
  redirect('/memos/tasks')
}
