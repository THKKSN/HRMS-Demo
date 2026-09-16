/**
 * แปลงจำนวนนาทีเป็นข้อความหน่วยประกอบ ไม่ใช้ทศนิยม
 *   45      → "45 นาที"
 *   90      → "1 ชม. 30 นาที"
 *   2160    → "1 วัน 12 ชม."   (ไม่ใช่ "1.5 วัน")
 *   4320    → "3 วัน"
 * ระดับวันไม่แสดงนาที — ปัดเป็นชั่วโมงก่อนแล้วค่อยแยกวัน กันกรณี "1 วัน 24 ชม."
 */
export function duration(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—'

  const totalMinutes = Math.max(0, Math.round(minutes))
  if (totalMinutes < 60) return `${totalMinutes} นาที`

  if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชม.`
  }

  const totalHours = Math.round(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours > 0 ? `${days} วัน ${hours} ชม.` : `${days} วัน`
}
