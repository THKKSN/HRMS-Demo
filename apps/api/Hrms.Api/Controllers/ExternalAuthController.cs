using Hrms.Api.Authorization;
using Hrms.Application.Features.ExternalTickets.Auth;
using Hrms.Application.Features.ExternalTickets.Profile;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/external")]
public sealed class ExternalAuthController(IMediator mediator) : ControllerBase
{
    [HttpPost("auth/line")]
    [AllowAnonymous]
    [EnableRateLimiting("external_auth")]
    public async Task<IActionResult> Login(
        [FromBody] ExternalLineLoginRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new ExternalLineLoginCommand(request.AccessToken), ct));

    [HttpGet("profile")]
    [Authorize(AuthenticationSchemes = ExternalAuthDefaults.Scheme, Policy = ExternalAuthDefaults.Policy)]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalReporterProfileQuery(), ct));

    [HttpPut("profile")]
    [Authorize(AuthenticationSchemes = ExternalAuthDefaults.Scheme, Policy = ExternalAuthDefaults.Policy)]
    [EnableRateLimiting("external_write")]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateExternalReporterProfileRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalReporterProfileCommand(
            request.FullName,
            request.Phone,
            request.Email,
            request.Organization), ct));
}

public sealed record ExternalLineLoginRequest(string AccessToken);

public sealed record UpdateExternalReporterProfileRequest(
    string FullName,
    string Phone,
    string Email,
    string Organization);
