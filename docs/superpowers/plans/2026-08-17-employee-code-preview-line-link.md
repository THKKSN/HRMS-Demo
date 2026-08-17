# Employee-Code Preview LINE Account Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace national-ID employee linking with an employee-code lookup that previews the employee's full name and requires explicit confirmation before sending the existing LINE OTP.

**Architecture:** Add a two-step, server-authoritative linking flow. A preview endpoint verifies LINE and returns only the employee's full name plus a five-minute Data Protection token bound to employee ID and LINE user ID; the OTP endpoint accepts that token, revalidates LINE and current employee eligibility, then uses the existing OTP/linking services. The LIFF page keeps the preview token only in React state and deploys atomically with the breaking API contract.

**Tech Stack:** .NET 8, ASP.NET Core Data Protection, MediatR, FluentValidation, EF Core 8/Pomelo MySQL, xUnit, FluentAssertions, Moq, Next.js 16, React 19, TypeScript, Zod 4, Node test runner, and Playwright.

## Global Constraints

- Use a separate worktree at execution time. The original workspace has 51 staged user files, including `apps/liff-web/app/auth/link/page.tsx`, `apps/liff-web/lib/liff.ts`, `playwright.config.ts`, and new auth tests; do not stage, unstage, overwrite, or commit those user changes.
- Before editing in the worktree, inspect `git diff --cached` from the original workspace and preserve the existing LINE OAuth callback cleanup, `buildLiffUrl` behavior, E2E LIFF access-token helper, and Playwright bypass behavior when producing the new final files.
- `/auth/link` accepts only an employee code for first-time employee linking; national ID is absent from the form, preview request, and OTP request.
- LINE access-token verification and the six-digit OTP remain mandatory. Employee code is a lookup key, not a password.
- The preview endpoint returns only `fullName`, `previewToken`, and `expiresIn`; it never returns employee ID, national ID, phone, email, department, company, or LINE user ID.
- Missing, inactive, and ambiguous employee-code matches use the same generic verification failure and do not expose a preview or generate an OTP.
- The preview token lifetime is exactly five minutes, is bound to employee ID and verified LINE user ID, and is protected with a persistent ASP.NET Core Data Protection key ring.
- `ALREADY_LINKED`, OTP validation/consumption, JWT and refresh-token issuance, subsequent LINE login, `next` redirects, and `auth_strict` rate limiting remain intact.
- The preview token, employee code, and previewed full name must not be written to local storage, session storage, query strings, analytics, application logs, or error details. The existing LINE access token remains in session storage only for the OTP page.
- No database migration is allowed.
- API and LIFF must be deployed as one release because `POST /v1/auth/otp/request` is a breaking contract change.

## File Map

- Create `apps/api/Hrms.Application/Common/Interfaces/ILinkPreviewTokenService.cs`: application-facing protected-token contract and identity record.
- Create `apps/api/Hrms.Infrastructure/Services/LinkPreviewTokenService.cs`: five-minute ASP.NET Core Data Protection implementation.
- Modify `apps/api/Hrms.Infrastructure/DependencyInjection.cs`: register the token service.
- Modify `apps/api/Hrms.Infrastructure/Hrms.Infrastructure.csproj`: add the .NET 8 Data Protection package explicitly.
- Modify `apps/api/Hrms.Api/Program.cs`: configure a named, persistent Data Protection key ring.
- Modify API appsettings files: add the non-secret `DataProtection:KeysPath` setting.
- Create `apps/api/Hrms.Application/Features/Auth/PreviewEmployeeLink/PreviewEmployeeLinkCommand.cs`: preview request/result and validation.
- Create `apps/api/Hrms.Application/Features/Auth/PreviewEmployeeLink/PreviewEmployeeLinkHandler.cs`: verified LINE + employee-code lookup and preview-token issuance.
- Modify `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpCommand.cs`: replace `NationalId` with `PreviewToken`.
- Modify `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpHandler.cs`: validate the preview identity and recheck employee eligibility before OTP generation.
- Modify `apps/api/Hrms.Api/Controllers/AuthController.cs`: add `/auth/link/preview` and update `/auth/otp/request` contracts and errors.
- Delete `apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs` only after `rg` proves it is no longer referenced.
- Create `apps/api/Hrms.Application.Tests/Auth/LinkPreviewTokenServiceTests.cs`: protected-token round trip and tamper tests.
- Create `apps/api/Hrms.Application.Tests/Auth/PreviewEmployeeLinkTests.cs`: lookup, privacy, ordering, and conflict tests.
- Modify `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs`: preview-token OTP tests and existing final-link regression.
- Modify `apps/liff-web/lib/auth-link.ts`: employee-code normalization and exact preview/OTP payload builders.
- Modify `apps/liff-web/lib/auth-link.test.mjs`: pure helper contract tests.
- Modify `apps/liff-web/app/auth/link/page.tsx`: employee-code entry, full-name preview, confirm/reject, and OTP transition.
- Modify `e2e/auth-link.spec.ts`: browser regression for the two-step flow.
- Modify `docs/07-auth-flow.md`: document employee code → name preview → confirmation → OTP.

---

### Task 1: Add the protected preview-token boundary

**Files:**
- Create: `apps/api/Hrms.Application/Common/Interfaces/ILinkPreviewTokenService.cs`
- Create: `apps/api/Hrms.Infrastructure/Services/LinkPreviewTokenService.cs`
- Create: `apps/api/Hrms.Application.Tests/Auth/LinkPreviewTokenServiceTests.cs`
- Modify: `apps/api/Hrms.Infrastructure/DependencyInjection.cs`
- Modify: `apps/api/Hrms.Infrastructure/Hrms.Infrastructure.csproj`
- Modify: `apps/api/Hrms.Api/Program.cs`
- Modify: `apps/api/Hrms.Api/appsettings.json`
- Modify: `apps/api/Hrms.Api/appsettings.Production.json`

**Interfaces:**
- Consumes: `IDataProtectionProvider`, `ITimeLimitedDataProtector`, and `DataProtection:KeysPath`.
- Produces: `LinkPreviewIdentity(Guid EmployeeId, string LineUserId)`, `ILinkPreviewTokenService.Create(Guid, string) -> string`, and `ILinkPreviewTokenService.Validate(string) -> LinkPreviewIdentity?`.

- [ ] **Step 1: Write failing protected-token tests**

Create `LinkPreviewTokenServiceTests.cs` with a temporary key directory and these concrete cases:

```csharp
using FluentAssertions;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Services;
using Microsoft.AspNetCore.DataProtection;

namespace Hrms.Application.Tests.Auth;

public sealed class LinkPreviewTokenServiceTests : IDisposable
{
    private readonly string _keysPath = Path.Combine(
        Path.GetTempPath(), $"hrms-link-preview-{Guid.NewGuid():N}");

    [Fact]
    public void CreateAndValidate_ShouldRoundTripEmployeeAndLineIdentity()
    {
        var employeeId = Guid.NewGuid();
        var provider = DataProtectionProvider.Create(new DirectoryInfo(_keysPath),
            options => options.SetApplicationName("Hrms.LineLink.Tests"));
        var service = new LinkPreviewTokenService(provider, TimeSpan.FromMinutes(5));

        var token = service.Create(employeeId, "U-LINE-123");
        var identity = service.Validate(token);

        identity.Should().Be(new LinkPreviewIdentity(employeeId, "U-LINE-123"));
        token.Should().NotContain(employeeId.ToString());
        token.Should().NotContain("U-LINE-123");
    }

    [Fact]
    public void Validate_ShouldRejectTamperedToken()
    {
        var provider = DataProtectionProvider.Create(new DirectoryInfo(_keysPath),
            options => options.SetApplicationName("Hrms.LineLink.Tests"));
        var service = new LinkPreviewTokenService(provider, TimeSpan.FromMinutes(5));
        var token = service.Create(Guid.NewGuid(), "U-LINE-123");
        var replacement = token[^1] == 'A' ? 'B' : 'A';

        service.Validate(token[..^1] + replacement).Should().BeNull();
        service.Validate("not-a-protected-token").Should().BeNull();
    }

    [Fact]
    public void Validate_ShouldRejectExpiredToken()
    {
        var provider = DataProtectionProvider.Create(new DirectoryInfo(_keysPath),
            options => options.SetApplicationName("Hrms.LineLink.Tests"));
        var service = new LinkPreviewTokenService(provider, TimeSpan.FromMinutes(-1));

        var token = service.Create(Guid.NewGuid(), "U-LINE-123");

        service.Validate(token).Should().BeNull();
    }

    public void Dispose()
    {
        if (Directory.Exists(_keysPath)) Directory.Delete(_keysPath, recursive: true);
    }
}
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~LinkPreviewTokenServiceTests"
```

Expected: FAIL because `ILinkPreviewTokenService`, `LinkPreviewIdentity`, and `LinkPreviewTokenService` do not exist.

- [ ] **Step 3: Add the application contract and Data Protection implementation**

Create the contract:

```csharp
namespace Hrms.Application.Common.Interfaces;

public sealed record LinkPreviewIdentity(Guid EmployeeId, string LineUserId);

public interface ILinkPreviewTokenService
{
    string Create(Guid employeeId, string lineUserId);
    LinkPreviewIdentity? Validate(string token);
}
```

Implement an isolated purpose and time-limited payload:

```csharp
using System.Security.Cryptography;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace Hrms.Infrastructure.Services;

public sealed class LinkPreviewTokenService : ILinkPreviewTokenService
{
    private const string Purpose = "Hrms.Auth.LineLinkPreview.v1";
    private readonly ITimeLimitedDataProtector _protector;
    private readonly TimeSpan _lifetime;

    public LinkPreviewTokenService(IDataProtectionProvider provider, TimeSpan lifetime)
    {
        _protector = provider.CreateProtector(Purpose).ToTimeLimitedDataProtector();
        _lifetime = lifetime;
    }

    public string Create(Guid employeeId, string lineUserId)
        => _protector.Protect(
            JsonSerializer.Serialize(new LinkPreviewIdentity(employeeId, lineUserId)),
            _lifetime);

    public LinkPreviewIdentity? Validate(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        try
        {
            return JsonSerializer.Deserialize<LinkPreviewIdentity>(_protector.Unprotect(token));
        }
        catch (Exception exception) when (
            exception is CryptographicException or JsonException or FormatException)
        {
            return null;
        }
    }
}
```

Add `Microsoft.AspNetCore.DataProtection` version `8.0.*` to `Hrms.Infrastructure.csproj`.

- [ ] **Step 4: Configure persistent keys and register the service**

In `Program.cs`, before `AddInfrastructureServices`, configure the key ring:

```csharp
var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName("Hrms.LineLink");
var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
    if (OperatingSystem.IsWindows())
        dataProtection.ProtectKeysWithDpapi(protectToLocalMachine: true);
}
else if (!builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("DataProtection:KeysPath must be configured outside Development.");
}
```

Add the singleton registration in `AddInfrastructureServices`:

```csharp
services.AddSingleton<ILinkPreviewTokenService>(provider =>
    new LinkPreviewTokenService(
        provider.GetRequiredService<IDataProtectionProvider>(),
        TimeSpan.FromMinutes(5)));
```

Add an empty default setting in `appsettings.json`:

```json
"DataProtection": {
  "KeysPath": ""
}
```

Override it in `appsettings.Production.json` with a path outside the publish directory:

```json
"DataProtection": {
  "KeysPath": "C:\\ProgramData\\TBG Assistant\\DataProtectionKeys"
}
```

Development uses the framework's per-user default key ring. Do not put encryption keys or secrets in appsettings.

- [ ] **Step 5: Run focused tests and build the API**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~LinkPreviewTokenServiceTests"
dotnet build apps/api/Hrms.Api/Hrms.Api.csproj -c Release
```

Expected: token tests PASS and Release build exits 0.

- [ ] **Step 6: Commit the token boundary**

```bash
git add apps/api/Hrms.Application/Common/Interfaces/ILinkPreviewTokenService.cs \
  apps/api/Hrms.Infrastructure/Services/LinkPreviewTokenService.cs \
  apps/api/Hrms.Infrastructure/DependencyInjection.cs \
  apps/api/Hrms.Infrastructure/Hrms.Infrastructure.csproj \
  apps/api/Hrms.Api/Program.cs apps/api/Hrms.Api/appsettings.json \
  apps/api/Hrms.Api/appsettings.Production.json \
  apps/api/Hrms.Application.Tests/Auth/LinkPreviewTokenServiceTests.cs
git commit -m "feat: add protected LINE link preview tokens"
```

---

### Task 2: Add the employee-code preview API

**Files:**
- Create: `apps/api/Hrms.Application/Features/Auth/PreviewEmployeeLink/PreviewEmployeeLinkCommand.cs`
- Create: `apps/api/Hrms.Application/Features/Auth/PreviewEmployeeLink/PreviewEmployeeLinkHandler.cs`
- Create: `apps/api/Hrms.Application.Tests/Auth/PreviewEmployeeLinkTests.cs`
- Modify: `apps/api/Hrms.Api/Controllers/AuthController.cs`

**Interfaces:**
- Consumes: `ILineAuthService.VerifyAccessTokenAsync(string, CancellationToken)` and `ILinkPreviewTokenService.Create(Guid, string)` from Task 1.
- Produces: `PreviewEmployeeLinkCommand(string AccessToken, string EmployeeCode)`, `PreviewEmployeeLinkResult(string FullName, string PreviewToken, int ExpiresIn)`, and `POST /v1/auth/link/preview`.

- [ ] **Step 1: Write failing preview-handler tests**

Create `PreviewEmployeeLinkTests.cs`. Reuse an EF in-memory database helper and mock LINE/token services. Cover these exact tests:

```csharp
[Fact]
public async Task Preview_ShouldReturnOnlyNameAndProtectedTokenForActiveUnlinkedEmployee()
{
    await using var db = CreateDb();
    var employee = Employee("EMP001", active: true);
    db.Employees.Add(employee);
    await db.SaveChangesAsync();
    var tokens = new Mock<ILinkPreviewTokenService>();
    tokens.Setup(x => x.Create(employee.Id, "U-LINE-123")).Returns("preview-token");
    var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

    var result = await handler.Handle(
        new PreviewEmployeeLinkCommand("line-token", "  EMP001  "), default);

    result.Should().Be(new PreviewEmployeeLinkResult(
        "Auth Test", "preview-token", 300));
}

[Fact]
public async Task Preview_ShouldVerifyLineBeforeReadingEmployees()
{
    var db = new Mock<IApplicationDbContext>(MockBehavior.Strict);
    db.SetupGet(x => x.Employees)
        .Throws(new InvalidOperationException("EMPLOYEE_QUERY_BEFORE_LINE"));
    var line = new Mock<ILineAuthService>();
    line.Setup(x => x.VerifyAccessTokenAsync("bad-token", It.IsAny<CancellationToken>()))
        .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
    var handler = new PreviewEmployeeLinkHandler(
        db.Object, line.Object, Mock.Of<ILinkPreviewTokenService>());

    var action = () => handler.Handle(
        new PreviewEmployeeLinkCommand("bad-token", "EMP001"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("INVALID_LINE_TOKEN");
    db.VerifyGet(x => x.Employees, Times.Never);
}
```

Add fail-closed lookup, conflict, and validator tests:

```csharp
[Theory]
[InlineData(0, true)]
[InlineData(1, false)]
[InlineData(2, true)]
public async Task Preview_ShouldRejectMissingInactiveOrAmbiguousEmployee(
    int employeeCount,
    bool active)
{
    await using var db = CreateDb();
    for (var index = 0; index < employeeCount; index++)
        db.Employees.Add(Employee("EMP001", active));
    await db.SaveChangesAsync();
    var tokens = new Mock<ILinkPreviewTokenService>();
    var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

    var action = () => handler.Handle(
        new PreviewEmployeeLinkCommand("line-token", "EMP001"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("EMPLOYEE_NOT_FOUND");
    tokens.Verify(x => x.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
}

[Fact]
public async Task Preview_ShouldPreserveAlreadyLinkedConflict()
{
    await using var db = CreateDb();
    var employee = Employee("EMP001", active: true);
    employee.LineUserId = "U-OTHER";
    db.Employees.Add(employee);
    await db.SaveChangesAsync();
    var handler = new PreviewEmployeeLinkHandler(
        db, VerifiedLine().Object, Mock.Of<ILinkPreviewTokenService>());

    var action = () => handler.Handle(
        new PreviewEmployeeLinkCommand("line-token", "EMP001"), default);

    var exception = await action.Should().ThrowAsync<ConflictException>();
    exception.Which.Code.Should().Be("ALREADY_LINKED");
}

[Theory]
[InlineData("")]
[InlineData("123456789012345678901234567890123456789012345678901")]
public void Validator_ShouldRejectEmptyOrOverlengthEmployeeCode(string employeeCode)
{
    var result = new PreviewEmployeeLinkCommandValidator().Validate(
        new PreviewEmployeeLinkCommand("line-token", employeeCode));

    result.IsValid.Should().BeFalse();
    result.Errors.Should().Contain(x => x.PropertyName == "EmployeeCode");
}
```

Use this helper so every test supplies valid required employee fields:

```csharp
private static Employee Employee(string employeeCode, bool active) => new()
{
    CompanyId = Guid.NewGuid(),
    EmployeeCode = employeeCode,
    FirstName = "Auth",
    LastName = "Test",
    IsActive = active
};
```

- [ ] **Step 2: Run preview tests and confirm RED**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~PreviewEmployeeLinkTests"
```

Expected: FAIL because the preview command and handler are missing.

- [ ] **Step 3: Implement the preview command, validator, and handler**

Create the contracts:

```csharp
public sealed record PreviewEmployeeLinkCommand(string AccessToken, string EmployeeCode)
    : IRequest<PreviewEmployeeLinkResult>;

public sealed record PreviewEmployeeLinkResult(
    string FullName,
    string PreviewToken,
    int ExpiresIn);

public sealed class PreviewEmployeeLinkCommandValidator
    : AbstractValidator<PreviewEmployeeLinkCommand>
{
    public PreviewEmployeeLinkCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.EmployeeCode)
            .Cascade(CascadeMode.Stop)
            .Must(value => !string.IsNullOrWhiteSpace(value))
            .WithMessage("EmployeeCode is required.")
            .Must(value => value.Trim().Length <= 50)
            .WithMessage("EmployeeCode must be at most 50 characters.");
    }
}
```

Implement the verified lookup in this order:

```csharp
public async Task<PreviewEmployeeLinkResult> Handle(
    PreviewEmployeeLinkCommand request,
    CancellationToken ct)
{
    var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);
    var employeeCode = request.EmployeeCode.Trim();
    var matches = await db.Employees
        .Where(x => x.EmployeeCode == employeeCode && x.IsActive)
        .Take(2)
        .ToListAsync(ct);

    if (matches.Count != 1)
        throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

    var employee = matches[0];
    if (employee.LineUserId is not null)
        throw new ConflictException(
            "ALREADY_LINKED",
            "This employee is already linked to a LINE account.");

    var fullName = $"{employee.FirstName} {employee.LastName}".Trim();
    return new PreviewEmployeeLinkResult(
        fullName,
        previewTokens.Create(employee.Id, profile.UserId),
        300);
}
```

- [ ] **Step 4: Add the rate-limited controller endpoint**

Add `PreviewEmployeeLinkRequest` and an endpoint before `otp/request`:

```csharp
[HttpPost("link/preview")]
[EnableRateLimiting("auth_strict")]
public async Task<IActionResult> PreviewEmployeeLink(
    [FromBody] PreviewEmployeeLinkRequest request,
    CancellationToken ct)
{
    try
    {
        return Ok(await mediator.Send(
            new PreviewEmployeeLinkCommand(request.AccessToken, request.EmployeeCode), ct));
    }
    catch (AppUnauthorizedException ex)
    {
        var code = ex.Message == "EMPLOYEE_NOT_FOUND"
            ? "EMPLOYEE_NOT_FOUND"
            : "INVALID_LINE_TOKEN";
        return Unauthorized(new { error = code, message = ex.Message });
    }
    catch (ConflictException ex)
    {
        return Conflict(new { error = ex.Code, message = ex.Message });
    }
}

public sealed record PreviewEmployeeLinkRequest(string AccessToken, string EmployeeCode);
```

- [ ] **Step 5: Run preview tests and the API build**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~PreviewEmployeeLinkTests"
dotnet build apps/api/Hrms.Api/Hrms.Api.csproj -c Release
```

Expected: preview tests PASS and build exits 0.

- [ ] **Step 6: Commit the preview API**

```bash
git add apps/api/Hrms.Application/Features/Auth/PreviewEmployeeLink \
  apps/api/Hrms.Api/Controllers/AuthController.cs \
  apps/api/Hrms.Application.Tests/Auth/PreviewEmployeeLinkTests.cs
git commit -m "feat: preview employee identity before LINE OTP"
```

---

### Task 3: Require the preview token before sending OTP

**Files:**
- Modify: `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpCommand.cs`
- Modify: `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpHandler.cs`
- Modify: `apps/api/Hrms.Api/Controllers/AuthController.cs`
- Modify: `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs`
- Delete: `apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs` if the reference scan is empty after this task.

**Interfaces:**
- Consumes: `ILinkPreviewTokenService.Validate(string) -> LinkPreviewIdentity?`, `ILineAuthService`, `IOtpService`, and `ILineMessagingService`.
- Produces: `RequestOtpCommand(string AccessToken, string PreviewToken)` and HTTP `OtpRequest(string AccessToken, string PreviewToken)`.

- [ ] **Step 1: Replace national-ID tests with failing preview-token OTP tests**

Keep the existing `LinkAccount_StillBindsVerifiedLineUserAfterOtpConfirmation` regression. Replace validator/handler tests with these cases:

```csharp
[Fact]
public async Task Handler_ShouldSendOtpForPreviewBoundToVerifiedLineUser()
{
    await using var db = CreateDb();
    var employee = Employee("EMP001", "unused-national-id");
    db.Employees.Add(employee);
    await db.SaveChangesAsync();
    var previewTokens = new Mock<ILinkPreviewTokenService>();
    previewTokens.Setup(x => x.Validate("preview-token"))
        .Returns(new LinkPreviewIdentity(employee.Id, "U-LINE-123"));
    var otp = new Mock<IOtpService>();
    otp.Setup(x => x.GenerateAndStoreAsync(
            employee.Id, "U-LINE-123", It.IsAny<CancellationToken>()))
        .ReturnsAsync("123456");
    var messaging = new Mock<ILineMessagingService>();
    var handler = new RequestOtpHandler(
        db, VerifiedLine().Object, previewTokens.Object, otp.Object, messaging.Object);

    await handler.Handle(
        new RequestOtpCommand("line-token", "preview-token"), default);

    messaging.Verify(x => x.PushMessageAsync(
        "U-LINE-123",
        It.Is<string>(message => message.Contains("123456")),
        It.IsAny<CancellationToken>()), Times.Once);
}

[Theory]
[InlineData(null)]
[InlineData("")]
public async Task Handler_ShouldRejectInvalidOrExpiredPreviewWithoutOtp(string? lineUserId)
{
    await using var db = CreateDb();
    var previewTokens = new Mock<ILinkPreviewTokenService>();
    previewTokens.Setup(x => x.Validate("invalid-preview"))
        .Returns(lineUserId is null ? null : new LinkPreviewIdentity(Guid.NewGuid(), lineUserId));
    var otp = new Mock<IOtpService>();
    var handler = new RequestOtpHandler(
        db, VerifiedLine().Object, previewTokens.Object, otp.Object,
        Mock.Of<ILineMessagingService>());

    var action = () => handler.Handle(
        new RequestOtpCommand("line-token", "invalid-preview"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
    otp.Verify(x => x.GenerateAndStoreAsync(
        It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
}
```

Add wrong-LINE, changed-employee, verification-order, and validator tests:

```csharp
[Fact]
public async Task Handler_ShouldRejectPreviewBoundToAnotherLineUser()
{
    await using var db = CreateDb();
    var previewTokens = new Mock<ILinkPreviewTokenService>();
    previewTokens.Setup(x => x.Validate("preview-token"))
        .Returns(new LinkPreviewIdentity(Guid.NewGuid(), "U-OTHER"));
    var otp = new Mock<IOtpService>();
    var handler = new RequestOtpHandler(
        db, VerifiedLine().Object, previewTokens.Object, otp.Object,
        Mock.Of<ILineMessagingService>());

    var action = () => handler.Handle(
        new RequestOtpCommand("line-token", "preview-token"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
    otp.Verify(x => x.GenerateAndStoreAsync(
        It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
}

[Theory]
[InlineData(false)]
[InlineData(true)]
public async Task Handler_ShouldRejectMissingOrInactiveEmployeeAfterPreview(
    bool employeeExists)
{
    await using var db = CreateDb();
    var employeeId = Guid.NewGuid();
    if (employeeExists)
    {
        var employee = Employee("EMP001", "unused-national-id");
        employee.Id = employeeId;
        employee.IsActive = false;
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
    }
    var previewTokens = new Mock<ILinkPreviewTokenService>();
    previewTokens.Setup(x => x.Validate("preview-token"))
        .Returns(new LinkPreviewIdentity(employeeId, "U-LINE-123"));
    var otp = new Mock<IOtpService>();
    var handler = new RequestOtpHandler(
        db, VerifiedLine().Object, previewTokens.Object, otp.Object,
        Mock.Of<ILineMessagingService>());

    var action = () => handler.Handle(
        new RequestOtpCommand("line-token", "preview-token"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
    otp.Verify(x => x.GenerateAndStoreAsync(
        It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
}

[Fact]
public async Task Handler_ShouldPreserveAlreadyLinkedConflictAfterPreview()
{
    await using var db = CreateDb();
    var employee = Employee("EMP001", "unused-national-id");
    employee.IsActive = true;
    employee.LineUserId = "U-EXISTING";
    db.Employees.Add(employee);
    await db.SaveChangesAsync();
    var previewTokens = new Mock<ILinkPreviewTokenService>();
    previewTokens.Setup(x => x.Validate("preview-token"))
        .Returns(new LinkPreviewIdentity(employee.Id, "U-LINE-123"));
    var handler = new RequestOtpHandler(
        db, VerifiedLine().Object, previewTokens.Object,
        Mock.Of<IOtpService>(), Mock.Of<ILineMessagingService>());

    var action = () => handler.Handle(
        new RequestOtpCommand("line-token", "preview-token"), default);

    var exception = await action.Should().ThrowAsync<ConflictException>();
    exception.Which.Code.Should().Be("ALREADY_LINKED");
}

[Fact]
public async Task Handler_ShouldVerifyLineBeforeValidatingPreviewToken()
{
    var line = new Mock<ILineAuthService>();
    line.Setup(x => x.VerifyAccessTokenAsync("bad-token", It.IsAny<CancellationToken>()))
        .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
    var previewTokens = new Mock<ILinkPreviewTokenService>(MockBehavior.Strict);
    var handler = new RequestOtpHandler(
        Mock.Of<IApplicationDbContext>(), line.Object, previewTokens.Object,
        Mock.Of<IOtpService>(), Mock.Of<ILineMessagingService>());

    var action = () => handler.Handle(
        new RequestOtpCommand("bad-token", "preview-token"), default);

    await action.Should().ThrowAsync<AppUnauthorizedException>()
        .WithMessage("INVALID_LINE_TOKEN");
    previewTokens.Verify(x => x.Validate(It.IsAny<string>()), Times.Never);
}

[Fact]
public void Validator_ShouldRejectEmptyPreviewToken()
{
    var result = new RequestOtpCommandValidator().Validate(
        new RequestOtpCommand("line-token", ""));

    result.IsValid.Should().BeFalse();
    result.Errors.Should().Contain(x => x.PropertyName == "PreviewToken");
}
```

- [ ] **Step 2: Run RequestOtp tests and confirm RED**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~RequestOtpTests"
```

Expected: FAIL because the current command still accepts `NationalId` and the handler does not consume preview tokens.

- [ ] **Step 3: Replace the command and handler data flow**

Change the command and validator:

```csharp
public sealed record RequestOtpCommand(string AccessToken, string PreviewToken)
    : IRequest<RequestOtpResult>;

public sealed class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.PreviewToken).NotEmpty();
    }
}
```

The handler must follow this order:

```csharp
var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);
var preview = previewTokens.Validate(request.PreviewToken);
if (preview is null ||
    !string.Equals(preview.LineUserId, profile.UserId, StringComparison.Ordinal))
    throw new AppUnauthorizedException("INVALID_OR_EXPIRED_PREVIEW");

var employee = await db.Employees.FirstOrDefaultAsync(
    x => x.Id == preview.EmployeeId && x.IsActive, ct);
if (employee is null)
    throw new AppUnauthorizedException("INVALID_OR_EXPIRED_PREVIEW");
if (employee.LineUserId is not null)
    throw new ConflictException(
        "ALREADY_LINKED",
        "This employee is already linked to a LINE account.");

var otpPlain = await otp.GenerateAndStoreAsync(employee.Id, profile.UserId, ct);
await messaging.PushMessageAsync(
    profile.UserId,
    $"รหัส OTP สำหรับเชื่อมบัญชี TBG Assistant: {otpPlain}\n(ใช้ได้ภายใน 5 นาที ห้ามแชร์รหัสนี้กับผู้อื่น)",
    ct);
return new RequestOtpResult("OTP ส่งแล้ว กรุณาตรวจสอบ LINE ของคุณ");
```

- [ ] **Step 4: Update the HTTP contract and remove unused national-ID code**

Change the controller record and construction:

```csharp
public sealed record OtpRequest(string AccessToken, string PreviewToken);

new RequestOtpCommand(request.AccessToken, request.PreviewToken)
```

Map invalid previews without echoing tokens or employee data:

```csharp
catch (AppUnauthorizedException ex)
{
    var code = ex.Message switch
    {
        "INVALID_OR_EXPIRED_PREVIEW" => "INVALID_OR_EXPIRED_PREVIEW",
        "EMPLOYEE_NOT_FOUND" => "EMPLOYEE_NOT_FOUND",
        _ => "INVALID_LINE_TOKEN"
    };
    return Unauthorized(new { error = code, message = ex.Message });
}
```

Run:

```bash
rg -n "ThaiNationalId|NationalId" apps/api/Hrms.Application apps/api/Hrms.Api apps/api/Hrms.Application.Tests/Auth
```

If `ThaiNationalId.cs` is the only remaining match for `ThaiNationalId`, delete that file with the editing tool. Do not remove `Employee.NationalId` or employee import mappings because they are outside this authentication change.

- [ ] **Step 5: Run all Auth tests and the complete API suite**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~Auth"
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj
```

Expected: all Auth tests PASS; the complete suite has zero failures, with only an explicitly documented environment-dependent skip permitted.

- [ ] **Step 6: Commit the confirmed OTP contract**

```bash
git add apps/api/Hrms.Application/Features/Auth/RequestOtp \
  apps/api/Hrms.Api/Controllers/AuthController.cs \
  apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs
git add -u apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs
git commit -m "feat: require employee preview before LINE OTP"
```

---

### Task 4: Replace LIFF auth-link helpers with exact two-step payloads

**Files:**
- Modify: `apps/liff-web/lib/auth-link.ts`
- Modify: `apps/liff-web/lib/auth-link.test.mjs`

**Interfaces:**
- Produces: `normalizeEmployeeCode(string) -> string`, `buildLinkPreviewPayload(string, string) -> { accessToken, employeeCode }`, and `buildOtpRequestPayload(string, string) -> { accessToken, previewToken }`.

- [ ] **Step 1: Write failing helper contract tests**

Replace national-ID tests with:

```javascript
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLinkPreviewPayload,
  buildOtpRequestPayload,
  normalizeEmployeeCode,
} from './auth-link.ts'

test('normalizes employee code by trimming only', () => {
  assert.equal(normalizeEmployeeCode('  Emp-001  '), 'Emp-001')
})

test('builds preview payload without national ID', () => {
  const payload = buildLinkPreviewPayload('line-token', '  EMP001  ')
  assert.deepEqual(payload, { accessToken: 'line-token', employeeCode: 'EMP001' })
  assert.equal(Object.hasOwn(payload, 'nationalId'), false)
})

test('builds confirmed OTP payload with preview token only', () => {
  const payload = buildOtpRequestPayload('line-token', 'preview-token')
  assert.deepEqual(payload, { accessToken: 'line-token', previewToken: 'preview-token' })
  assert.equal(Object.hasOwn(payload, 'employeeCode'), false)
  assert.equal(Object.hasOwn(payload, 'nationalId'), false)
})
```

- [ ] **Step 2: Run helper tests and confirm RED**

Run:

```bash
node --experimental-strip-types --test apps/liff-web/lib/auth-link.test.mjs
```

Expected: FAIL because the preview builder and employee-code normalizer are missing and the OTP builder still accepts national ID.

- [ ] **Step 3: Implement the minimal helpers**

```typescript
export function normalizeEmployeeCode(value: string): string {
  return value.trim()
}

export function buildLinkPreviewPayload(accessToken: string, employeeCode: string) {
  return { accessToken, employeeCode: normalizeEmployeeCode(employeeCode) }
}

export function buildOtpRequestPayload(accessToken: string, previewToken: string) {
  return { accessToken, previewToken }
}
```

- [ ] **Step 4: Run helper tests and confirm GREEN**

Run:

```bash
node --experimental-strip-types --test apps/liff-web/lib/auth-link.test.mjs
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the LIFF contracts**

```bash
git add apps/liff-web/lib/auth-link.ts apps/liff-web/lib/auth-link.test.mjs
git commit -m "test: define employee preview LIFF contracts"
```

---

### Task 5: Build the employee-name preview UI and browser regression

**Files:**
- Modify: `apps/liff-web/app/auth/link/page.tsx`
- Modify: `e2e/auth-link.spec.ts`
- Preserve: `apps/liff-web/lib/liff.ts`
- Preserve: `playwright.config.ts`

**Interfaces:**
- Consumes: `POST /auth/link/preview`, `POST /auth/otp/request`, and the helper functions from Task 4.
- Produces: employee-code entry → full-name preview → confirmed OTP navigation UI.

- [ ] **Step 1: Write failing Playwright tests for preview, reject, and confirm**

Replace the national-ID browser cases with these flows:

```typescript
test('shows full name before sending OTP and preserves next after confirmation', async ({ page }) => {
  let previewBody: unknown
  let otpBody: unknown
  await page.route('http://api.test/v1/auth/link/preview', async route => {
    previewBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      json: { fullName: 'สมชาย ใจดี', previewToken: 'preview-token', expiresIn: 300 },
    })
  })
  await page.route('http://api.test/v1/auth/otp/request', async route => {
    otpBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, json: { hint: 'OTP sent' } })
  })

  await page.goto('/auth/link?next=%2Fleaves')
  await expect(page.getByLabel('รหัสพนักงาน')).toBeVisible()
  await expect(page.getByLabel('เลขบัตรประชาชน')).toHaveCount(0)
  await page.getByLabel('รหัสพนักงาน').fill('  EMP001  ')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()

  await expect(page.getByText('สมชาย ใจดี')).toBeVisible()
  expect(previewBody).toEqual({
    accessToken: 'e2e-line-access-token',
    employeeCode: 'EMP001',
  })
  expect(otpBody).toBeUndefined()

  await page.getByRole('button', { name: 'ใช่ นี่คือฉัน' }).click()
  await expect(page).toHaveURL(/\/auth\/otp\?next=%2Fleaves$/)
  expect(otpBody).toEqual({
    accessToken: 'e2e-line-access-token',
    previewToken: 'preview-token',
  })
})

test('not-me action clears preview and returns to editable code', async ({ page }) => {
  await page.route('http://api.test/v1/auth/link/preview', route => route.fulfill({
    status: 200,
    json: { fullName: 'ไม่ใช่ ผู้ใช้', previewToken: 'preview-token', expiresIn: 300 },
  }))
  await page.goto('/auth/link')
  await page.getByLabel('รหัสพนักงาน').fill('EMP002')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await page.getByRole('button', { name: 'ไม่ใช่ กลับไปแก้ไข' }).click()

  await expect(page.getByLabel('รหัสพนักงาน')).toBeEditable()
  await expect(page.getByText('ไม่ใช่ ผู้ใช้')).toHaveCount(0)
})
```

Add local validation and preview-error browser tests:

```typescript
test('blocks empty and overlength employee codes without an API call', async ({ page }) => {
  let previewRequestCount = 0
  await page.route('http://api.test/v1/auth/link/preview', route => {
    previewRequestCount += 1
    return route.abort()
  })
  await page.goto('/auth/link')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('กรุณากรอกรหัสพนักงาน')).toBeVisible()
  await page.getByLabel('รหัสพนักงาน').fill('X'.repeat(51))
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('รหัสพนักงานต้องไม่เกิน 50 ตัวอักษร')).toBeVisible()
  expect(previewRequestCount).toBe(0)
})

test('preview failure shows no stale identity', async ({ page }) => {
  await page.route('http://api.test/v1/auth/link/preview', route => route.fulfill({
    status: 401,
    json: { error: 'EMPLOYEE_NOT_FOUND', message: 'ไม่สามารถยืนยันข้อมูลพนักงานได้' },
  }))
  await page.goto('/auth/link')
  await page.getByLabel('รหัสพนักงาน').fill('UNKNOWN')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('ไม่สามารถยืนยันข้อมูลพนักงานได้')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ใช่ นี่คือฉัน' })).toHaveCount(0)
})

test('already-linked preview preserves the recovery route', async ({ page }) => {
  await page.route('http://api.test/v1/auth/link/preview', route => route.fulfill({
    status: 409,
    json: { error: 'ALREADY_LINKED', message: 'Account already linked' },
  }))
  await page.route('http://api.test/v1/auth/line', route => route.fulfill({
    status: 500,
    json: { message: 'หยุดการทดสอบหลังเข้าหน้ากู้คืน' },
  }))
  await page.goto('/auth/link?next=%2Fleaves')
  await page.getByLabel('รหัสพนักงาน').fill('EMP001')
  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page).toHaveURL(/\/auth\/already-linked\?next=%2Fleaves$/)
})
```

At the end of the successful confirmation test, assert session storage contains only the required LINE token and none of the preview values:

```typescript
expect(await page.evaluate(() => sessionStorage.getItem('liff_access_token')))
  .toBe('e2e-line-access-token')
const sessionValues = await page.evaluate(() =>
  Array.from({ length: sessionStorage.length }, (_, index) => {
    const key = sessionStorage.key(index)
    return key ? sessionStorage.getItem(key) : null
  }),
)
expect(sessionValues).not.toContain('EMP001')
expect(sessionValues).not.toContain('สมชาย ใจดี')
expect(sessionValues).not.toContain('preview-token')
```

- [ ] **Step 2: Run the browser spec and confirm RED**

Run:

```bash
pnpm exec playwright test e2e/auth-link.spec.ts
```

Expected: FAIL because the page still renders national ID and sends OTP immediately.

- [ ] **Step 3: Implement the employee-code entry and preview state**

Use this schema and state:

```typescript
const schema = z.object({
  employeeCode: z.string()
    .trim()
    .min(1, 'กรุณากรอกรหัสพนักงาน')
    .max(50, 'รหัสพนักงานต้องไม่เกิน 50 ตัวอักษร'),
})

type LinkPreview = {
  fullName: string
  previewToken: string
  expiresIn: number
}

const [preview, setPreview] = useState<LinkPreview | null>(null)
const [isConfirming, setIsConfirming] = useState(false)
```

The form submit must call preview only:

```typescript
const response = await api.post<LinkPreview>(
  '/auth/link/preview',
  buildLinkPreviewPayload(accessToken, values.employeeCode),
)
setPreview(response.data)
```

Render the full name as text and the exact actions “ใช่ นี่คือฉัน” and “ไม่ใช่ กลับไปแก้ไข”. The not-me action must execute:

```typescript
setPreview(null)
setErrorMsg(null)
reset({ employeeCode: '' })
```

- [ ] **Step 4: Implement confirmed OTP submission and recovery paths**

The confirm handler must guard double clicks and keep sensitive values in component state only:

```typescript
const confirmIdentity = async () => {
  if (!preview || isConfirming) return
  setIsConfirming(true)
  setErrorMsg(null)
  try {
    const accessToken = getLiffAccessToken()
    if (!accessToken) throw new Error('ไม่พบ LINE access token กรุณาเปิดในแอป LINE')
    await api.post(
      '/auth/otp/request',
      buildOtpRequestPayload(accessToken, preview.previewToken),
    )
    sessionStorage.setItem('liff_access_token', accessToken)
    router.push(next ? `/auth/otp?next=${encodeURIComponent(next)}` : '/auth/otp')
  } catch (error) {
    setPreview(null)
    if (isAxiosError(error)) {
      const data = error.response?.data as ApiError | undefined
      if (error.response?.status === 409) {
        sessionStorage.setItem('liff_access_token', getLiffAccessToken() ?? '')
        router.push(
          next ? `/auth/already-linked?next=${encodeURIComponent(next)}` : '/auth/already-linked',
        )
        return
      }
      setErrorMsg(data?.message ?? 'กรุณาตรวจสอบรหัสพนักงานใหม่อีกครั้ง')
    } else if (error instanceof Error) {
      setErrorMsg(error.message)
    }
  } finally {
    setIsConfirming(false)
  }
}
```

Do not log `values`, `preview`, request bodies, or errors containing response payloads.

Preserve the staged LINE OAuth callback cleanup, `buildLiffUrl`, `getLiffAccessToken`, LIFF provider error UI, E2E access-token bypass, and `next` handling from the original workspace.

- [ ] **Step 5: Run helper tests, browser tests, and LIFF build**

Run:

```bash
node --experimental-strip-types --test apps/liff-web/lib/auth-link.test.mjs
pnpm exec playwright test e2e/auth-link.spec.ts
pnpm --filter liff-web build
```

Expected: helper tests PASS, all auth-link Playwright cases PASS, and Next.js build exits 0.

- [ ] **Step 6: Commit the preview UI**

```bash
git add apps/liff-web/app/auth/link/page.tsx apps/liff-web/lib/liff.ts \
  e2e/auth-link.spec.ts playwright.config.ts
git commit -m "feat: confirm employee preview before LINE OTP"
```

---

### Task 6: Document, verify, and prepare the atomic release

**Files:**
- Modify: `docs/07-auth-flow.md`
- Verify only: `apps/api/Hrms.Infrastructure/Migrations/`

**Interfaces:**
- Consumes: the completed API and LIFF contracts from Tasks 1-5.
- Produces: current authentication documentation and release evidence with no migration.

- [ ] **Step 1: Update the authentication flow documentation**

Replace the national-ID linking sequence with:

```text
กรอกรหัสพนักงาน
  → POST /auth/link/preview { accessToken, employeeCode }
  → API ตรวจ LINE ก่อนค้นหาพนักงาน
  → แสดงชื่อ-นามสกุลเต็ม
  → ผู้ใช้กด “ใช่ นี่คือฉัน”
  → POST /auth/otp/request { accessToken, previewToken }
  → API ตรวจ LINE + preview token + สถานะพนักงาน
  → ส่ง OTP ทาง LINE
  → POST /auth/link ยืนยัน OTP และผูกบัญชี
```

Document the five-minute preview lifetime, persistent Data Protection key ring, generic lookup errors, no storage/logging of identity preview values, and atomic API+LIFF deployment.

- [ ] **Step 2: Run the complete verification suite with fresh output**

Run:

```powershell
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj
dotnet build apps/api/Hrms.Api/Hrms.Api.csproj -c Release
```

Run:

```bash
node --experimental-strip-types --test apps/liff-web/lib/auth-link.test.mjs
pnpm --filter liff-web build
pnpm exec playwright test e2e/auth-link.spec.ts
git diff --name-only -- apps/api/Hrms.Infrastructure/Migrations
```

Expected: zero test/build failures and no migration path in the final command output. Record any pre-existing warning or environment-dependent skip exactly rather than reporting it as a pass.

- [ ] **Step 3: Verify the Production key-ring prerequisite**

On the IIS server, create `C:\ProgramData\TBG Assistant\DataProtectionKeys` outside the publish directory and grant Modify permission only to the API application-pool identity and administrators. Confirm `appsettings.Production.json` points to that directory, recycle the pool, and verify the API starts without a Data Protection configuration error.

Do not place the key ring inside the deploy folder, commit generated key files, or delete keys during rollback. A key-ring backup must be included in the existing server backup procedure.

- [ ] **Step 4: Commit documentation**

```bash
git add docs/07-auth-flow.md
git commit -m "docs: describe employee preview LINE linking"
```

- [ ] **Step 5: Publish and deploy API and LIFF together**

Build immutable artifacts from the same commit:

```powershell
dotnet publish apps/api/Hrms.Api/Hrms.Api.csproj -c Release -o artifacts/api-employee-link-preview
```

```bash
pnpm --filter liff-web build
```

Deploy the API and LIFF during one release window. Recycle IIS after the key path and permissions are present. If either artifact fails, roll back both artifacts together while preserving Data Protection keys.

- [ ] **Step 6: Run Production smoke checks**

Verify in this order without placing PII or tokens in screenshots/logs:

1. `/health` and `/health/ready` return Healthy.
2. Unknown employee code returns the generic failure and no name.
3. Valid employee code displays the correct full name and sends no OTP yet.
4. “ไม่ใช่” returns to empty code entry.
5. “ใช่ นี่คือฉัน” sends one OTP and navigates to `/auth/otp`.
6. Correct OTP links the account and opens the requested `next` page.
7. A subsequent LIFF visit signs in automatically without preview.
8. Admin password login and external reporter authentication still work.

Record the tested release commit and timestamp. Do not record the employee code, full name, preview token, LINE access token, or OTP.
