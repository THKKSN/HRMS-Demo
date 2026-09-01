import { redirect } from 'next/navigation'

// รวมเป็นหน้า detail ร่วมที่ /memos/[id] แล้ว — คง route เดิมไว้กัน bookmark/ลิงก์เก่าพัง
export default async function ApprovalMemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/memos/${id}`)
}
