# National-ID-Only LINE Account Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `/auth/link` to identify an active employee with a valid 13-digit Thai national ID only, while retaining verified LINE OAuth and six-digit OTP confirmation before account binding.

**Architecture:** Add small, independently tested Thai-national-ID validators in the .NET application and LIFF client, then remove `EmployeeCode` from the OTP request contract end to end. The API verifies the LINE token first, accepts exactly one active national-ID match, and fails closed for missing or duplicate data; the LIFF page performs equivalent client validation and sends the reduced payload.

**Tech Stack:** .NET 8, ASP.NET Core, MediatR, FluentValidation, EF Core 8, xUnit, FluentAssertions, Moq, Next.js 16, React 19, TypeScript, Zod 4, Node test runner, Playwright.

## Global Constraints

- LINE OAuth and a six-digit OTP remain mandatory; the national ID is a lookup key, not a standalone password.
- Accept exactly 13 ASCII digits whose Thai checksum is `(11 - (sum % 11)) % 10`, using weights 13 down to 2 for digits 1-12.
- Validate the national ID on both client and server; the API is authoritative.
- Never persist the national ID in local storage, session storage, query strings, telemetry, application logs, or user-visible server errors.
- Missing, inactive, and duplicate active employee matches must not generate an OTP and must use the same generic employee-verification failure.
- Preserve `ALREADY_LINKED`, OTP delivery/confirmation, JWT/refresh-token issuance, subsequent LINE login, `next` redirects, and the existing `auth_strict` rate limits.
- Do not add a database migration or change admin password login, external ticket authentication, employee import, OTP storage, or OTP lifetime.
- `apps/liff-web/app/auth/link/page.tsx` already has user changes in the current worktree; inspect and preserve its existing diff while applying this plan.

---

## File Map

- Create `apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs`: authoritative server-side checksum predicate.
- Create `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs`: validator, lookup, duplicate-safety, LINE-token ordering, already-linked, and OTP-link regression tests.
- Modify `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpCommand.cs`: remove `EmployeeCode` and apply checksum validation.
- Modify `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpHandler.cs`: look up by national ID only and require exactly one active result.
- Modify `apps/api/Hrms.Api/Controllers/AuthController.cs`: reduce `OtpRequest` and construct the two-argument command.
- Create `apps/liff-web/lib/auth-link.ts`: pure client checksum and OTP-payload helpers.
- Create `apps/liff-web/lib/auth-link.test.mjs`: Node tests for checksum and exact payload shape.
- Modify `apps/liff-web/lib/liff.ts`: expose a testable access-token accessor with an E2E-only token under the existing bypass flag.
- Modify `apps/liff-web/app/auth/link/page.tsx`: render one field, use checksum validation, and send the reduced payload.
- Create `e2e/auth-link.spec.ts`: browser regression for the one-field form and local checksum error.
- Modify `playwright.config.ts`: enable the existing LIFF authentication bypass only in the Playwright development server.
- Modify `docs/07-auth-flow.md`: document the actual access-token, national-ID-only, OTP linking flow.

---

### Task 1: Secure the API contract and employee lookup

**Files:**
- Create: `apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs`
- Create: `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs`
- Modify: `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpCommand.cs:1-22`
- Modify: `apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpHandler.cs:14-35`
- Modify: `apps/api/Hrms.Api/Controllers/AuthController.cs:57-76,125-129`
- Test: `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs`

**Interfaces:**
- Consumes: `ILineAuthService.VerifyAccessTokenAsync(string, CancellationToken)`, `IOtpService.GenerateAndStoreAsync(Guid, string, CancellationToken)`, and `ILineMessagingService.PushMessageAsync(string, string, CancellationToken)`.
- Produces: `ThaiNationalId.IsValid(string? value) -> bool`, `RequestOtpCommand(string AccessToken, string NationalId)`, and HTTP body `OtpRequest(string AccessToken, string NationalId)`.

- [ ] **Step 1: Write failing API tests for the reduced contract, checksum, and safe lookup**

Create `apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs` with these concrete cases and shared setup:

```csharp
using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Auth.LinkAccount;
using Hrms.Application.Features.Auth.RequestOtp;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Auth;

public sealed class RequestOtpTests
{
    private const string ValidNationalId = "1103703466623";

    [Fact]
    public void Validator_AcceptsValidThaiNationalIdWithoutEmployeeCode()
    {
        var result = new RequestOtpCommandValidator()
            .Validate(new RequestOtpCommand("line-token", ValidNationalId));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("110370346662")]
    [InlineData("11037034666233")]
    [InlineData("110370346662X")]
    [InlineData("1103703466624")]
    public void Validator_RejectsMalformedOrWrongChecksumNationalId(string nationalId)
    {
        var result = new RequestOtpCommandValidator()
            .Validate(new RequestOtpCommand("line-token", nationalId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "NationalId");
    }

    [Fact]
    public async Task Handler_FindsEmployeeByNationalIdAndSendsOtpToVerifiedLineUser()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP-NOT-SENT", ValidNationalId);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var line = VerifiedLine();
        var otp = new Mock<IOtpService>();
        otp.Setup(service => service.GenerateAndStoreAsync(
                employee.Id, "U-LINE-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync("123456");
        var messaging = new Mock<ILineMessagingService>();
        var handler = new RequestOtpHandler(db, line.Object, otp.Object, messaging.Object);

        var result = await handler.Handle(
            new RequestOtpCommand("line-token", ValidNationalId), default);

        result.Hint.Should().Be("OTP ส่งแล้ว กรุณาตรวจสอบ LINE ของคุณ");
        otp.VerifyAll();
        messaging.Verify(service => service.PushMessageAsync(
            "U-LINE-123",
            It.Is<string>(message => message.Contains("123456")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handler_RejectsDuplicateActiveNationalIdWithoutGeneratingOtp()
    {
        await using var db = CreateDb();
        db.Employees.AddRange(
            Employee("EMP-DUP-1", ValidNationalId),
            Employee("EMP-DUP-2", ValidNationalId));
        await db.SaveChangesAsync();
        var otp = new Mock<IOtpService>();
        var messaging = new Mock<ILineMessagingService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, otp.Object, messaging.Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", ValidNationalId), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("EMPLOYEE_NOT_FOUND");
        otp.Verify(service => service.GenerateAndStoreAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        messaging.Verify(service => service.PushMessageAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handler_RejectsInactiveEmployeeWithoutGeneratingOtp()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP-INACTIVE", ValidNationalId);
        employee.IsActive = false;
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, otp.Object, new Mock<ILineMessagingService>().Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", ValidNationalId), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("EMPLOYEE_NOT_FOUND");
        otp.Verify(service => service.GenerateAndStoreAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handler_RejectsMissingEmployeeWithoutGeneratingOtp()
    {
        await using var db = CreateDb();
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, otp.Object, new Mock<ILineMessagingService>().Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", ValidNationalId), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("EMPLOYEE_NOT_FOUND");
        otp.Verify(service => service.GenerateAndStoreAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handler_PreservesAlreadyLinkedConflict()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP-LINKED", ValidNationalId);
        employee.LineUserId = "U-OTHER";
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var handler = new RequestOtpHandler(
            db,
            VerifiedLine().Object,
            new Mock<IOtpService>().Object,
            new Mock<ILineMessagingService>().Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", ValidNationalId), default);

        var exception = await action.Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("ALREADY_LINKED");
    }

    [Fact]
    public async Task Handler_VerifiesLineTokenBeforeGeneratingOtp()
    {
        await using var db = CreateDb();
        db.Employees.Add(Employee("EMP-LINE-FAIL", ValidNationalId));
        await db.SaveChangesAsync();
        var line = new Mock<ILineAuthService>();
        line.Setup(service => service.VerifyAccessTokenAsync(
                "bad-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, line.Object, otp.Object, new Mock<ILineMessagingService>().Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("bad-token", ValidNationalId), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_LINE_TOKEN");
        otp.Verify(service => service.GenerateAndStoreAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LinkAccount_StillBindsVerifiedLineUserAfterOtpConfirmation()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP-OTP-LINK", ValidNationalId);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var otp = new Mock<IOtpService>();
        otp.Setup(service => service.ValidateAndConsumeAsync(
                "U-LINE-123", "123456", It.IsAny<CancellationToken>()))
            .ReturnsAsync(employee.Id);
        var jwt = new Mock<IJwtService>();
        jwt.Setup(service => service.GenerateAccessToken(
                It.IsAny<Employee>(), It.IsAny<IEnumerable<EmployeeRole>>()))
            .Returns(("access-token", DateTime.UtcNow.AddMinutes(15)));
        jwt.Setup(service => service.GenerateRefreshToken())
            .Returns(("refresh-token", "refresh-hash", DateTime.UtcNow.AddDays(7)));
        var handler = new LinkAccountHandler(db, VerifiedLine().Object, otp.Object, jwt.Object);

        var result = await handler.Handle(
            new LinkAccountCommand("line-token", "123456", null, null), default);

        result.AccessToken.Should().Be("access-token");
        result.RefreshToken.Should().Be("refresh-token");
        (await db.Employees.SingleAsync()).LineUserId.Should().Be("U-LINE-123");
        (await db.RefreshTokens.CountAsync()).Should().Be(1);
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"request-otp-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static Employee Employee(string employeeCode, string nationalId) => new()
    {
        CompanyId = Guid.NewGuid(),
        EmployeeCode = employeeCode,
        FirstName = "Auth",
        LastName = "Test",
        NationalId = nationalId,
        IsActive = true
    };

    private static Mock<ILineAuthService> VerifiedLine()
    {
        var line = new Mock<ILineAuthService>();
        line.Setup(service => service.VerifyAccessTokenAsync(
                "line-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LineProfile("U-LINE-123", "LINE Test", null));
        return line;
    }
}
```

- [ ] **Step 2: Run the new API tests and confirm the contract fails before implementation**

Run:

```bash
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter FullyQualifiedName~RequestOtpTests
```

Expected: FAIL to compile because `RequestOtpCommand` still requires `EmployeeCode`; `ThaiNationalId` and the new lookup behavior do not exist yet.

- [ ] **Step 3: Add the authoritative server checksum helper**

Create `apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs`:

```csharp
namespace Hrms.Application.Common.Validation;

public static class ThaiNationalId
{
    public static bool IsValid(string? value)
    {
        if (value is null || value.Length != 13 || value.Any(ch => ch is < '0' or > '9'))
            return false;

        var sum = 0;
        for (var index = 0; index < 12; index++)
            sum += (value[index] - '0') * (13 - index);

        var expectedCheckDigit = (11 - sum % 11) % 10;
        return expectedCheckDigit == value[12] - '0';
    }
}
```

- [ ] **Step 4: Reduce and validate the application command**

Replace the command and validator in `RequestOtpCommand.cs` with:

```csharp
using FluentValidation;
using Hrms.Application.Common.Validation;
using MediatR;

namespace Hrms.Application.Features.Auth.RequestOtp;

public record RequestOtpCommand(string AccessToken, string NationalId)
    : IRequest<RequestOtpResult>;

public record RequestOtpResult(string Hint);

public class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.NationalId)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(ThaiNationalId.IsValid)
            .WithMessage("NationalId must be a valid Thai national ID.");
    }
}
```

- [ ] **Step 5: Make employee lookup deterministic and fail closed**

In `RequestOtpHandler.Handle`, retain LINE verification first, then replace the current `FirstOrDefaultAsync` lookup with:

```csharp
var matches = await db.Employees
    .Where(employee => employee.NationalId == request.NationalId && employee.IsActive)
    .Take(2)
    .ToListAsync(ct);

if (matches.Count != 1)
    throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

var employee = matches[0];
```

Keep the existing `ALREADY_LINKED` check, OTP generation, LINE push text, and generic success hint unchanged. Do not log `request.NationalId`.

- [ ] **Step 6: Reduce the HTTP request DTO and controller mapping**

Change `AuthController.RequestOtp` to construct:

```csharp
new RequestOtpCommand(request.AccessToken, request.NationalId)
```

Change the record at the bottom of `AuthController.cs` to:

```csharp
public record OtpRequest(string AccessToken, string NationalId);
```

Do not modify the `[EnableRateLimiting("auth_strict")]` attributes or exception mappings.

- [ ] **Step 7: Run focused tests and compile the full API**

Run:

```bash
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter FullyQualifiedName~RequestOtpTests
dotnet build apps/api/Hrms.slnx --no-restore
```

Expected: all `RequestOtpTests` PASS and the solution builds with 0 errors.

- [ ] **Step 8: Commit the API unit**

```bash
git add apps/api/Hrms.Application/Common/Validation/ThaiNationalId.cs apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpCommand.cs apps/api/Hrms.Application/Features/Auth/RequestOtp/RequestOtpHandler.cs apps/api/Hrms.Api/Controllers/AuthController.cs apps/api/Hrms.Application.Tests/Auth/RequestOtpTests.cs
git commit -m "feat: link LINE accounts by national ID"
```

---

### Task 2: Simplify and test the LIFF account-link form

**Files:**
- Create: `apps/liff-web/lib/auth-link.ts`
- Create: `apps/liff-web/lib/auth-link.test.mjs`
- Create: `e2e/auth-link.spec.ts`
- Modify: `apps/liff-web/lib/liff.ts:1-42`
- Modify: `apps/liff-web/app/auth/link/page.tsx:3-31,115-125,146-204`
- Modify: `playwright.config.ts:25-28`
- Test: `apps/liff-web/lib/auth-link.test.mjs`
- Test: `e2e/auth-link.spec.ts`

**Interfaces:**
- Consumes: the initialized LIFF SDK, Zod `refine`, and `api.post('/auth/otp/request', payload)`.
- Produces: `getLiffAccessToken() -> string | null`, `isValidThaiNationalId(value: string) -> boolean`, and `buildOtpRequestPayload(accessToken: string, nationalId: string) -> { accessToken: string; nationalId: string }`.

- [ ] **Step 1: Write failing pure-function tests for client validation and payload privacy**

Create `apps/liff-web/lib/auth-link.test.mjs`:

```javascript
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOtpRequestPayload, isValidThaiNationalId } from './auth-link.ts'

test('accepts a correctly checksummed Thai national ID', () => {
  assert.equal(isValidThaiNationalId('1103703466623'), true)
})

test('rejects malformed and wrong-checksum national IDs', () => {
  for (const value of ['', '110370346662', '11037034666233', '110370346662X', '1103703466624']) {
    assert.equal(isValidThaiNationalId(value), false, value)
  }
})

test('builds an OTP request without employee code', () => {
  const payload = buildOtpRequestPayload('line-token', '1103703466623')

  assert.deepEqual(payload, {
    accessToken: 'line-token',
    nationalId: '1103703466623',
  })
  assert.equal(Object.hasOwn(payload, 'employeeCode'), false)
})
```

- [ ] **Step 2: Run the client unit test and confirm the missing module failure**

Run:

```bash
pnpm --filter liff-web exec node --test lib/auth-link.test.mjs
```

Expected: FAIL with module-not-found for `lib/auth-link.ts`.

- [ ] **Step 3: Implement the pure client helper**

Create `apps/liff-web/lib/auth-link.ts`:

```typescript
export function isValidThaiNationalId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false

  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(value[index]) * (13 - index)
  }

  const expectedCheckDigit = (11 - (sum % 11)) % 10
  return expectedCheckDigit === Number(value[12])
}

export function buildOtpRequestPayload(accessToken: string, nationalId: string) {
  return { accessToken, nationalId }
}
```

- [ ] **Step 4: Add a production-safe LIFF access-token accessor for browser tests**

Add this export to `apps/liff-web/lib/liff.ts` after the `liff` proxy declaration:

```typescript
export function getLiffAccessToken(): string | null {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true') {
    return 'e2e-line-access-token'
  }

  return liff.getAccessToken()
}
```

The fixed token is available only when the Playwright web server explicitly sets the bypass environment variable. Production behavior continues to call the initialized LIFF SDK.

- [ ] **Step 5: Reduce the Zod schema and form UI to one field**

In `apps/liff-web/app/auth/link/page.tsx`:

- change the icon import to `CreditCard, Loader2`;
- import `buildOtpRequestPayload` and `isValidThaiNationalId` from `@/lib/auth-link`;
- import `getLiffAccessToken` with `buildLiffUrl` and `liff` from `@/lib/liff`;
- replace the schema with:

```typescript
const schema = z.object({
  nationalId: z
    .string()
    .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก')
    .refine(isValidThaiNationalId, 'เลขบัตรประชาชนไม่ถูกต้อง'),
})
```

- remove the complete employee-code label/input/error block;
- retain the national-ID field with `type="text"`, `inputMode="numeric"`, `autoComplete="off"`, and `maxLength={13}`;
- replace `const accessToken = liff.getAccessToken()` with `const accessToken = getLiffAccessToken()`;
- replace the 409 recovery call `liff.getAccessToken() ?? ''` with `getLiffAccessToken() ?? ''`;
- change only the API call body to:

```typescript
await api.post(
  '/auth/otp/request',
  buildOtpRequestPayload(accessToken, values.nationalId),
)
```

Do not add the national ID to session storage. Keep only the existing LINE access token in `liff_access_token` for the OTP page.

- [ ] **Step 6: Run the client unit tests and TypeScript build**

Run:

```bash
pnpm --filter liff-web exec node --test lib/auth-link.test.mjs
pnpm --filter liff-web build
```

Expected: three Node tests PASS and the Next.js production build completes with 0 errors.

- [ ] **Step 7: Write browser regressions for validation, payload, redirect, and already-linked handling**

Create `e2e/auth-link.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'

test('LINE account link asks only for a valid Thai national ID', async ({ page }) => {
  await page.goto('/auth/link')

  await expect(page.getByRole('heading', { name: 'ผูกบัญชี LINE' })).toBeVisible()
  await expect(page.getByLabel('เลขบัตรประชาชน')).toBeVisible()
  await expect(page.getByLabel('รหัสพนักงาน')).toHaveCount(0)

  await page.getByLabel('เลขบัตรประชาชน').fill('1103703466624')
  await page.getByRole('button', { name: 'ดำเนินการต่อ →' }).click()

  await expect(page.getByText('เลขบัตรประชาชนไม่ถูกต้อง')).toBeVisible()
})

test('valid input sends the reduced payload and preserves next', async ({ page }) => {
  let requestBody: unknown
  await page.route('http://api.test/v1/auth/otp/request', async route => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, json: { hint: 'OTP sent' } })
  })
  await page.goto('/auth/link?next=%2Fleaves')

  await page.getByLabel('เลขบัตรประชาชน').fill('1103703466623')
  await page.getByRole('button', { name: 'ดำเนินการต่อ →' }).click()

  await expect(page).toHaveURL(/\/auth\/otp\?next=%2Fleaves$/)
  expect(requestBody).toEqual({
    accessToken: 'e2e-line-access-token',
    nationalId: '1103703466623',
  })
  expect(await page.evaluate(() => sessionStorage.getItem('liff_access_token')))
    .toBe('e2e-line-access-token')
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage })))
    .not.toContain('1103703466623')
})

test('already-linked response keeps the recovery route', async ({ page }) => {
  await page.route('http://api.test/v1/auth/otp/request', route => route.fulfill({
    status: 409,
    json: { error: 'ALREADY_LINKED', message: 'Account already linked' },
  }))
  await page.route('http://api.test/v1/auth/line', route => route.fulfill({
    status: 500,
    json: { message: 'หยุดการทดสอบหลังเข้าหน้ากู้คืน' },
  }))
  await page.goto('/auth/link')

  await page.getByLabel('เลขบัตรประชาชน').fill('1103703466623')
  await page.getByRole('button', { name: 'ดำเนินการต่อ →' }).click()

  await expect(page).toHaveURL(/\/auth\/already-linked$/)
  await expect(page.getByText('เข้าสู่ระบบไม่สำเร็จ')).toBeVisible()
})
```

Add the existing provider's test-only bypass to `playwright.config.ts` under `webServer.env`:

```typescript
NEXT_PUBLIC_E2E_AUTH_BYPASS: 'true',
```

- [ ] **Step 8: Run the browser regressions at the primary mobile viewport**

Run:

```bash
pnpm exec playwright test e2e/auth-link.spec.ts --project=mobile-375
```

Expected: 3 tests PASS. The form appears without real LINE OAuth, invalid checksum input never reaches the API, the successful request has no employee code, `next` is preserved, and HTTP 409 still enters the existing recovery route.

- [ ] **Step 9: Inspect the existing user diff and commit only LIFF-related files**

Run:

```bash
git diff -- apps/liff-web/app/auth/link/page.tsx
git diff --check -- apps/liff-web/lib/auth-link.ts apps/liff-web/lib/auth-link.test.mjs apps/liff-web/lib/liff.ts apps/liff-web/app/auth/link/page.tsx e2e/auth-link.spec.ts playwright.config.ts
```

Confirm the pre-existing layout/LIFF changes in `page.tsx` remain intact, then commit:

```bash
git add apps/liff-web/lib/auth-link.ts apps/liff-web/lib/auth-link.test.mjs apps/liff-web/lib/liff.ts apps/liff-web/app/auth/link/page.tsx e2e/auth-link.spec.ts playwright.config.ts
git commit -m "feat: simplify LINE account link form"
```

---

### Task 3: Update authentication documentation and run regressions

**Files:**
- Modify: `docs/07-auth-flow.md:12-42,65-70`
- Reference: `docs/superpowers/specs/2026-08-17-national-id-only-line-link-design.md`

**Interfaces:**
- Consumes: the completed API and LIFF behavior from Tasks 1-2.
- Produces: current operator/developer documentation and final verification evidence.

- [ ] **Step 1: Correct the documented employee LINE flow**

Update Flow A in `docs/07-auth-flow.md` so it states:

```text
Employee เปิด LIFF
   │
   ▼
liff.init({ liffId }) → ตรวจ LINE login
   │
   ▼
liff.getAccessToken() → POST /auth/line { accessToken }
   │
   ├── พบ line_user_id → issue JWT → เข้าใช้งาน
   │
   └── ACCOUNT_NOT_LINKED → /auth/link
                              │
                              ▼
                     กรอกเลขบัตรประชาชน 13 หลัก
                     ตรวจรูปแบบและ checksum ไทย
                              │
                              ▼
                     POST /auth/otp/request
                     { accessToken, nationalId }
                              │
                              ▼
                     รับ OTP ทาง LINE และยืนยัน
                              │
                              ▼
                     ผูก line_user_id → issue JWT
```

Remove the outdated employee-code and last-four-digit wording. State that the server requires exactly one active national-ID match and rejects ambiguous duplicates without sending an OTP. Keep the existing security notes about token audience, OTP lifetime, rate limiting, and auditing only where they match current behavior.

- [ ] **Step 2: Run focused and full regression checks**

Run:

```bash
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter FullyQualifiedName~RequestOtpTests
dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj
pnpm --filter liff-web exec node --test lib/auth-link.test.mjs
pnpm --filter liff-web build
pnpm exec playwright test e2e/auth-link.spec.ts --project=mobile-375
```

Expected:

- all focused Auth tests PASS;
- the full API test suite has 0 failures;
- all three client helper tests PASS;
- the LIFF production build has 0 errors;
- the mobile Auth browser test PASS.

- [ ] **Step 3: Verify privacy, scope, and stale references**

Run:

```bash
rg -n "EmployeeCode|employeeCode" apps/api/Hrms.Application/Features/Auth/RequestOtp apps/api/Hrms.Api/Controllers/AuthController.cs apps/liff-web/app/auth/link/page.tsx apps/liff-web/lib/auth-link.ts
rg -n "otp/request" apps docs -g '!**/bin/**' -g '!**/obj/**' -g '!**/.next/**'
git diff --check
```

Expected:

- the first command returns no employee-code reference in the OTP request flow;
- every OTP-request caller sends only `accessToken` and `nationalId`;
- no national ID is written to storage, URLs, logs, or errors;
- `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Commit the documentation update**

```bash
git add -f docs/07-auth-flow.md
git commit -m "docs: update LINE account linking flow"
```

- [ ] **Step 5: Record final implementation evidence**

Run:

```bash
git log -3 --oneline
git status --short
```

Expected: three feature commits are present. Existing unrelated user changes may remain, but none is included in these commits. Report the exact test counts and any environment-specific skipped checks in the handoff.
