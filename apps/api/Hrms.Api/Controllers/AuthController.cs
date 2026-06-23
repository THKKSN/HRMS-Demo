using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.LinkAccount;
using Hrms.Application.Features.Auth.LoginWithLine;
using Hrms.Application.Features.Auth.LoginWithPassword;
using Hrms.Application.Features.Auth.Logout;
using Hrms.Application.Features.Auth.RefreshToken;
using Hrms.Application.Features.Auth.RequestOtp;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/auth")]
public class AuthController(IMediator mediator) : ControllerBase
{
    /// <summary>Login ด้วย LINE access token → คืน JWT</summary>
    [HttpPost("line")]
    [EnableRateLimiting("auth_strict")]
    public async Task<IActionResult> LoginWithLine([FromBody] LineLoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new LoginWithLineCommand(request.AccessToken, Ip, UserAgent), ct);
            return Ok(result);
        }
        catch (AccountNotLinkedException ex)
        {
            return Conflict(new { error = "ACCOUNT_NOT_LINKED", lineUserId = ex.LineUserId });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = "INVALID_LINE_TOKEN", message = ex.Message });
        }
    }

    /// <summary>ขอ access token ใหม่ด้วย refresh token (rotation)</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new RefreshTokenCommand(request.RefreshToken, Ip, UserAgent), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = "INVALID_REFRESH_TOKEN", message = ex.Message });
        }
    }

    /// <summary>ขอ OTP เพื่อเริ่มผูก LINE กับบัญชีพนักงาน</summary>
    [HttpPost("otp/request")]
    [EnableRateLimiting("auth_strict")]
    public async Task<IActionResult> RequestOtp([FromBody] OtpRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new RequestOtpCommand(request.AccessToken, request.EmployeeCode, request.NationalId), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = "EMPLOYEE_NOT_FOUND", message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    /// <summary>ยืนยัน OTP → ผูกบัญชี LINE + คืน JWT (auto-login)</summary>
    [HttpPost("link")]
    [EnableRateLimiting("auth_strict")]
    public async Task<IActionResult> LinkAccount([FromBody] LinkRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new LinkAccountCommand(request.AccessToken, request.Otp, Ip, UserAgent), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = "INVALID_OR_EXPIRED_OTP", message = ex.Message });
        }
    }

    /// <summary>Login ด้วย Email + Password (Desktop / Admin)</summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth_strict")]
    public async Task<IActionResult> LoginWithPassword([FromBody] PasswordLoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new LoginWithPasswordCommand(request.Email, request.Password, Ip, UserAgent), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ยกเลิก refresh token ปัจจุบัน</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        await mediator.Send(new LogoutCommand(request.RefreshToken), ct);
        return NoContent();
    }

    private string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();
    private string? UserAgent => Request.Headers.UserAgent.ToString();
}

public record LineLoginRequest(string AccessToken);
public record RefreshRequest(string RefreshToken);
public record OtpRequest(string AccessToken, string EmployeeCode, string NationalId);
public record LinkRequest(string AccessToken, string Otp);
public record PasswordLoginRequest(string Email, string Password);
