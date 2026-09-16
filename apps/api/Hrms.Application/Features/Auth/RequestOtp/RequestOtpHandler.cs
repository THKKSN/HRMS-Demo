using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Auth.RequestOtp;

public class RequestOtpHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    ILinkPreviewTokenService previewTokens,
    IOtpService otp,
    ILineMessagingService messaging,
    IJwtService jwt) : IRequestHandler<RequestOtpCommand, RequestOtpResult>
{
    public async Task<RequestOtpResult> Handle(RequestOtpCommand request, CancellationToken ct)
    {
        // 1) LINE ก่อนเสมอ — preview token ที่หลุดไปใช้ไม่ได้ถ้าไม่มี access token ที่ verify ผ่าน
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        // 2) preview token ต้องผูกกับ LINE user คนเดียวกับที่เพิ่ง verify
        var preview = previewTokens.Validate(request.PreviewToken);
        if (preview is null ||
            !string.Equals(preview.LineUserId, profile.UserId, StringComparison.Ordinal))
            throw new AppUnauthorizedException("INVALID_OR_EXPIRED_PREVIEW");

        // 3) เช็กสถานะพนักงานใหม่อีกครั้ง เพราะอาจถูกปิดใช้งานหรือผูกบัญชีไปแล้ว
        //    ในช่วง 5 นาทีระหว่าง preview กับตอนกดยืนยัน
        //    โหลด Roles มาด้วยเผื่อต้องออก session ตรงในเคส push เต็ม
        var employee = await db.Employees
            .Include(e => e.Roles.Where(r => r.IsActive))
            .FirstOrDefaultAsync(x => x.Id == preview.EmployeeId && x.IsActive, ct);
        if (employee is null)
            throw new AppUnauthorizedException("INVALID_OR_EXPIRED_PREVIEW");

        if (employee.LineUserId is not null)
            throw new ConflictException(
                "ALREADY_LINKED",
                "This employee is already linked to a LINE account.");

        var otpPlain = await otp.GenerateAndStoreAsync(employee.Id, profile.UserId, ct);

        var message = $"รหัส OTP สำหรับเชื่อมบัญชี TBG Assistant: {otpPlain}\n(ใช้ได้ภายใน 5 นาที ห้ามแชร์รหัสนี้กับผู้อื่น)";
        try
        {
            await messaging.PushMessageAsync(profile.UserId, message, ct);
        }
        catch (LinePushQuotaExceededException)
        {
            // LINE ส่ง OTP ไม่ได้เพราะโควตารายเดือนเต็ม (429 มาจาก LINE เอง client ปลอมไม่ได้)
            // OTP ตัวนี้ push เข้า LINE บัญชีเดียวกับที่ access token เพิ่ง verify อยู่แล้ว จึง
            // แทบไม่ได้เพิ่ม factor ใหม่ — เคสนี้จึงผูกบัญชีให้เลยเพื่อไม่ให้พนักงานใหม่ติดค้าง
            var session = await employee.BindLineAndIssueSessionAsync(
                db, jwt, profile.UserId, profile.PictureUrl, request.Ip, request.UserAgent, ct);
            return new RequestOtpResult(
                "ระบบยืนยันตัวตนให้อัตโนมัติเนื่องจากส่ง OTP ทาง LINE ไม่ได้ชั่วคราว",
                session);
        }

        return new RequestOtpResult("OTP ส่งแล้ว กรุณาตรวจสอบ LINE ของคุณ");
    }
}
