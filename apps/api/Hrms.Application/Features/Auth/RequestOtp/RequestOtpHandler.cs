using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Auth.RequestOtp;

public class RequestOtpHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    IOtpService otp,
    ILineMessagingService messaging) : IRequestHandler<RequestOtpCommand, RequestOtpResult>
{
    public async Task<RequestOtpResult> Handle(RequestOtpCommand request, CancellationToken ct)
    {
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e =>
                e.EmployeeCode == request.EmployeeCode &&
                e.NationalId == request.NationalId &&
                e.IsActive, ct);

        if (employee is null)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        if (employee.LineUserId is not null)
            throw new ConflictException("ALREADY_LINKED", "This employee is already linked to a LINE account.");

        var otpPlain = await otp.GenerateAndStoreAsync(employee.Id, profile.UserId, ct);

        var message = $"รหัส OTP สำหรับเชื่อมบัญชี HRMS: {otpPlain}\n(ใช้ได้ภายใน 5 นาที ห้ามแชร์รหัสนี้กับผู้อื่น)";
        await messaging.PushMessageAsync(profile.UserId, message, ct);

        return new RequestOtpResult("OTP ส่งแล้ว กรุณาตรวจสอบ LINE ของคุณ");
    }
}
