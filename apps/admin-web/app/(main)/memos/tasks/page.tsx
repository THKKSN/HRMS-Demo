'use client'

import { MemoStepTaskList } from '@/components/memos/memo-step-task-list'

// งานขั้นตอนที่รอผู้ใช้ดำเนินการ — บ้านของ "กลุ่มที่ 4" ที่ไม่ใช่ผู้ขอ ผู้อนุมัติ หรือหัวหน้าแผนกปลายทาง
// แต่ถูกปักหมุดเป็นผู้รับผิดชอบขั้นตอนไว้ (ข้ามแผนกได้) จึงไม่มี permission gate
export default function MemoTasksPage() {
  return <MemoStepTaskList asPage />
}
