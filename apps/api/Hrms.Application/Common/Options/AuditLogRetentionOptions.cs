namespace Hrms.Application.Common.Options;

/// <summary>
/// นโยบายเก็บรักษา audit log แบบ "เดือนปฏิทิน" — เก็บเดือนปัจจุบัน + เดือนเต็มย้อนหลังตามจำนวนที่กำหนด
/// ตัดข้อมูลที่วันที่ 1 ของเดือนเสมอ ไม่ใช่ rolling window ที่ตัดกลางช่วง
/// ก่อนลบแต่ละเดือนจะ archive เป็นไฟล์ JSON Lines บีบอัด gzip เดือนละ 1 ไฟล์ก่อน ถ้า archive ไม่สำเร็จจะไม่ลบ
/// </summary>
public sealed class AuditLogRetentionOptions
{
    public const string SectionName = "AuditLogRetention";

    /// <summary>เปิด/ปิด job ลบ audit log อัตโนมัติ</summary>
    public bool Enabled { get; init; } = true;

    /// <summary>
    /// จำนวนเดือนเต็มย้อนหลังที่เก็บไว้ (ไม่นับเดือนปัจจุบัน)
    /// เช่น 3 = เก็บเดือนปัจจุบัน + 3 เดือนก่อนหน้า, ข้อมูลก่อนวันที่ 1 ของเดือนที่ 4 ย้อนหลังจะถูกลบ
    /// </summary>
    public int RetentionMonths { get; init; } = 3;

    /// <summary>สำรองข้อมูลเป็นไฟล์ก่อนลบหรือไม่ (ปิดได้ถ้าต้องการลบทิ้งเฉยๆ)</summary>
    public bool ArchiveEnabled { get; init; } = true;

    /// <summary>
    /// โฟลเดอร์เก็บไฟล์ archive (audit-logs-yyyy-MM.jsonl.gz)
    /// ว่าง = ใช้ %ProgramData%\TBG Assistant\AuditLogArchive ซึ่งอยู่นอกโฟลเดอร์ publish จึงไม่หายตอน deploy ทับ
    /// </summary>
    public string ArchivePath { get; init; } = string.Empty;

    /// <summary>จำนวนแถวที่ลบต่อ 1 รอบ SaveChanges เพื่อไม่ให้ lock ตารางนาน</summary>
    public int BatchSize { get; init; } = 1000;

    /// <summary>จำนวนเดือนสูงสุดที่ archive + ลบต่อการรัน 1 ครั้ง (กัน backlog ยาวหลังเซิร์ฟเวอร์หยุดไปนาน)</summary>
    public int MaxMonthsPerRun { get; init; } = 12;
}
