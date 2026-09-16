namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// LINE ปฏิเสธ push เพราะโควตาข้อความรายเดือนเต็ม (HTTP 429)
///
/// สืบทอดจาก HttpRequestException เพื่อให้ catch เดิมที่ดัก push ล้ม (เช่น NotificationDeliveryJob)
/// ยังจับเคสนี้ได้เหมือนเดิม ส่วน flow ที่อยากแยกเคสนี้ออกมา (ผูกบัญชีข้าม OTP) ค่อย catch ตัวนี้ก่อน
/// </summary>
public sealed class LinePushQuotaExceededException(string? responseBody = null)
    : HttpRequestException("LINE push rejected: monthly message quota exceeded (429).")
{
    public string? ResponseBody { get; } = responseBody;
}
