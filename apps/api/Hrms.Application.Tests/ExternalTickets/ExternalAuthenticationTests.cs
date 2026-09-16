using System.IdentityModel.Tokens.Jwt;
using System.Net;
using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.ExternalTickets.Auth;
using Hrms.Application.Features.ExternalTickets.Profile;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.ExternalTickets;

public sealed class ExternalAuthenticationTests
{
    [Fact]
    public async Task Login_ShouldRejectUserWhoIsNotOaFriend_WhenConfigRequiresFriendship()
    {
        await using var db = CreateDb();
        db.ExternalTicketConfigurations.Add(Configuration(requireOaFriendship: true));
        await db.SaveChangesAsync();
        var line = new FakeLineAuthService
        {
            Profile = new LineProfile("U123", "LINE Name", null),
            IsFriend = false
        };
        var handler = new ExternalLineLoginHandler(db, line, new FakeExternalTokenService());

        var act = () => handler.Handle(new ExternalLineLoginCommand("line-access-token"), default);

        // ต้องอยู่ที่ `Code` ไม่ใช่ `Message` — หน้าจอ external ใช้ code นี้เลือกจอ "กรุณาแอดเพื่อน"
        await act.Should().ThrowAsync<AppForbiddenException>()
            .Where(e => e.Code == "LINE_OA_FRIEND_REQUIRED");
        (await db.ExternalReporters.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Login_ShouldAllowUserWhoIsNotOaFriend_WhenConfigDoesNotRequireFriendship()
    {
        await using var db = CreateDb();
        db.ExternalTicketConfigurations.Add(Configuration(requireOaFriendship: false));
        await db.SaveChangesAsync();
        var line = new FakeLineAuthService
        {
            Profile = new LineProfile("U123", "LINE Name", null),
            IsFriend = false
        };
        var handler = new ExternalLineLoginHandler(db, line, new FakeExternalTokenService());

        var result = await handler.Handle(new ExternalLineLoginCommand("line-access-token"), default);

        result.AccessToken.Should().Be("external-token");
        (await db.ExternalReporters.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Login_ShouldReportLinkedEmployeeWithoutUsingEmployeeIdentity()
    {
        await using var db = CreateDb();
        db.Employees.Add(Employee("U123"));
        await db.SaveChangesAsync();
        var line = new FakeLineAuthService
        {
            Profile = new LineProfile("U123", "LINE Name", "https://line.example/picture.jpg"),
            IsFriend = true
        };
        var token = new FakeExternalTokenService();
        var handler = new ExternalLineLoginHandler(db, line, token);

        var result = await handler.Handle(new ExternalLineLoginCommand("line-access-token"), default);

        result.LinkedEmployee.Should().BeTrue();
        result.Reporter.Id.Should().NotBeEmpty();
        result.AccessToken.Should().Be("external-token");
        result.ExpiresIn.Should().BeInRange(899, 900);
        token.GeneratedForReporterId.Should().Be(result.Reporter.Id);
        (await db.ExternalReporters.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Login_ShouldRejectInactiveReporter()
    {
        await using var db = CreateDb();
        db.ExternalReporters.Add(new ExternalReporter
        {
            LineUserId = "U-inactive",
            LineDisplayName = "Inactive",
            LastLoginAt = DateTime.UtcNow,
            IsActive = false
        });
        await db.SaveChangesAsync();
        var handler = new ExternalLineLoginHandler(
            db,
            new FakeLineAuthService
            {
                Profile = new LineProfile("U-inactive", "Inactive", null),
                IsFriend = true
            },
            new FakeExternalTokenService());

        var act = () => handler.Handle(new ExternalLineLoginCommand("line-access-token"), default);

        await act.Should().ThrowAsync<AppForbiddenException>()
            .Where(e => e.Code == "EXTERNAL_REPORTER_INACTIVE");
    }

    [Fact]
    public async Task UpdateProfile_ShouldNormalizeContact()
    {
        await using var db = CreateDb();
        var reporter = new ExternalReporter
        {
            LineUserId = "U-profile",
            LineDisplayName = "LINE Profile",
            LastLoginAt = DateTime.UtcNow
        };
        db.ExternalReporters.Add(reporter);
        await db.SaveChangesAsync();
        var handler = new UpdateExternalReporterProfileHandler(
            db,
            new TestExternalCurrentUser(reporter.Id, reporter.LineUserId));

        var result = await handler.Handle(new UpdateExternalReporterProfileCommand(
            "  สมชาย ผู้แจ้ง  ",
            " +66 81-234-5678 ",
            " SOMCHAI@EXAMPLE.COM ",
            " Supplier A ",
            " th "), default);

        result.FullName.Should().Be("สมชาย ผู้แจ้ง");
        result.Phone.Should().Be("+66812345678");
        result.PhoneCountry.Should().Be("TH");
        result.Email.Should().Be("somchai@example.com");
        result.Organization.Should().Be("Supplier A");
    }

    [Fact]
    public async Task UpdateProfile_ShouldStoreForeignNumberAsGiven()
    {
        await using var db = CreateDb();
        var reporter = new ExternalReporter
        {
            LineUserId = "U-foreign",
            LineDisplayName = "Overseas Reporter",
            LastLoginAt = DateTime.UtcNow
        };
        db.ExternalReporters.Add(reporter);
        await db.SaveChangesAsync();
        var handler = new UpdateExternalReporterProfileHandler(
            db,
            new TestExternalCurrentUser(reporter.Id, reporter.LineUserId));

        var result = await handler.Handle(new UpdateExternalReporterProfileCommand(
            "Lim Wei",
            "+65 9123 4567",
            "lim@example.sg",
            "Supplier SG",
            "SG"), default);

        result.Phone.Should().Be("+6591234567");
        result.PhoneCountry.Should().Be("SG");
    }

    [Fact]
    public void ExternalToken_ShouldContainOnlyExternalIdentityClaims()
    {
        var reporter = new ExternalReporter
        {
            LineUserId = "U-token",
            LineDisplayName = "LINE Token",
            LastLoginAt = DateTime.UtcNow
        };
        var service = new ExternalTokenService(Options.Create(new ExternalJwtOptions
        {
            Secret = "external-test-secret-at-least-32-characters",
            Issuer = "hrms-external-tests",
            Audience = "hrms-external-liff-tests",
            AccessTokenExpiryMinutes = 15
        }));

        var (token, _) = service.GenerateAccessToken(reporter);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Subject.Should().Be(reporter.Id.ToString());
        jwt.Claims.Single(x => x.Type == "actor_type").Value.Should().Be("external");
        jwt.Claims.Single(x => x.Type == "external_reporter_id").Value.Should().Be(reporter.Id.ToString());
        jwt.Claims.Single(x => x.Type == "line_uid").Value.Should().Be(reporter.LineUserId);
        jwt.Claims.Should().NotContain(x => x.Type == "roles" || x.Type.EndsWith("/role"));
    }

    [Fact]
    public async Task InvalidLineToken_ShouldNotExposeProviderResponseBody()
    {
        const string providerBody = "sensitive-line-provider-response";
        var http = new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(
            HttpStatusCode.Unauthorized)
        {
            Content = new StringContent(providerBody)
        }));
        var service = new LineAuthService(http, Options.Create(new LineOptions
        {
            ChannelId = "expected-channel"
        }));

        var act = () => service.VerifyAccessTokenAsync("secret-line-token", default);

        var exception = await act.Should().ThrowAsync<AppUnauthorizedException>();
        exception.Which.Message.Should().NotContain(providerBody);
        exception.Which.Message.Should().NotContain("secret-line-token");
    }

    [Fact]
    public void LoginValidation_ShouldRejectBlankAccessToken()
    {
        var result = new ExternalLineLoginCommandValidator()
            .Validate(new ExternalLineLoginCommand("  "));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(x => x.PropertyName == "AccessToken");
    }

    [Fact]
    public void ProfileValidation_ShouldRejectInvalidContactFields()
    {
        var result = new UpdateExternalReporterProfileCommandValidator().Validate(
            new UpdateExternalReporterProfileCommand("", "123", "not-email", "", ""));

        result.IsValid.Should().BeFalse();
        result.Errors.Select(x => x.PropertyName).Should().Contain([
            "FullName", "Phone", "Email", "Organization", "PhoneCountry"]);
    }

    [Theory]
    [InlineData("+66812345678", "TH")]     // ไทย
    [InlineData("+6591234567", "SG")]      // สิงคโปร์ ไม่มี 0 นำหน้า
    [InlineData("+447911123456", "GB")]    // อังกฤษ
    [InlineData("+1 202-555-0123", "US")]  // มีอักขระคั่นติดมา — normalize ก่อนตรวจ
    public void ProfileValidation_ShouldAcceptE164Numbers(string phone, string country)
    {
        var result = new UpdateExternalReporterProfileCommandValidator().Validate(
            new UpdateExternalReporterProfileCommand("ผู้แจ้ง", phone, "user@example.com", "Supplier", country));

        result.IsValid.Should().BeTrue(because: $"{phone} เป็น E.164 ที่ถูกต้อง");
    }

    [Theory]
    [InlineData("0812345678")]      // รูปแบบไทยเดิม ไม่มีรหัสประเทศ
    [InlineData("0066812345678")]   // 00 นำหน้าแทน + ใช้ไม่ได้ข้ามประเทศ
    [InlineData("+0812345678")]     // รหัสประเทศขึ้นต้นด้วย 0
    [InlineData("+66123")]          // สั้นกว่าสเปก
    [InlineData("+6612345678901234")] // 16 หลัก ยาวเกินสเปก E.164
    public void ProfileValidation_ShouldRejectNonE164Numbers(string phone)
    {
        var result = new UpdateExternalReporterProfileCommandValidator().Validate(
            new UpdateExternalReporterProfileCommand("ผู้แจ้ง", phone, "user@example.com", "Supplier", "TH"));

        result.IsValid.Should().BeFalse();
        result.Errors.Select(x => x.PropertyName).Should().Contain("Phone");
    }

    [Theory]
    [InlineData("THA")]  // alpha-3 ไม่ใช่รูปแบบที่เก็บ
    [InlineData("T")]
    [InlineData("66")]
    public void ProfileValidation_ShouldRejectInvalidCountryCode(string country)
    {
        var result = new UpdateExternalReporterProfileCommandValidator().Validate(
            new UpdateExternalReporterProfileCommand(
                "ผู้แจ้ง", "+66812345678", "user@example.com", "Supplier", country));

        result.IsValid.Should().BeFalse();
        result.Errors.Select(x => x.PropertyName).Should().Contain("PhoneCountry");
    }

    [Fact]
    public void ExternalToken_ShouldFailEmployeeTokenValidation()
    {
        var reporter = new ExternalReporter
        {
            LineUserId = "U-isolation",
            LineDisplayName = "Isolation",
            LastLoginAt = DateTime.UtcNow
        };
        var service = new ExternalTokenService(Options.Create(new ExternalJwtOptions
        {
            Secret = "external-test-secret-at-least-32-characters",
            Issuer = "hrms-external-tests",
            Audience = "hrms-external-liff-tests"
        }));
        var (externalToken, _) = service.GenerateAccessToken(reporter);
        var employeeParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "hrms-api-tests",
            ValidateAudience = true,
            ValidAudience = "hrms-client-tests",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes("employee-test-secret-at-least-32-characters")),
            ClockSkew = TimeSpan.Zero
        };

        var act = () => new JwtSecurityTokenHandler()
            .ValidateToken(externalToken, employeeParameters, out _);

        act.Should().Throw<SecurityTokenException>();
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"external-auth-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static ExternalTicketConfiguration Configuration(bool requireOaFriendship) => new()
    {
        TargetCompanyId = Hrms.Domain.Constants.ExternalTicketConstants.TargetCompanyId,
        RequireOaFriendship = requireOaFriendship,
        IsEnabled = true
    };

    private static Employee Employee(string lineUserId) => new()
    {
        CompanyId = Guid.NewGuid(),
        EmployeeCode = "EMP-EXT-TEST",
        FirstName = "Linked",
        LastName = "Employee",
        LineUserId = lineUserId,
        IsActive = true
    };

    private sealed class FakeLineAuthService : ILineAuthService
    {
        public required LineProfile Profile { get; init; }
        public bool IsFriend { get; init; }

        public Task<LineProfile> VerifyAccessTokenAsync(string accessToken, CancellationToken ct)
            => Task.FromResult(Profile);

        public Task<bool> GetFriendshipStatusAsync(string accessToken, CancellationToken ct)
            => Task.FromResult(IsFriend);
    }

    private sealed class FakeExternalTokenService : IExternalTokenService
    {
        public Guid? GeneratedForReporterId { get; private set; }

        public (string token, DateTime expiresAt) GenerateAccessToken(ExternalReporter reporter)
        {
            GeneratedForReporterId = reporter.Id;
            return ("external-token", DateTime.UtcNow.AddMinutes(15));
        }
    }

    private sealed class TestExternalCurrentUser(Guid reporterId, string lineUserId) : IExternalCurrentUser
    {
        public Guid? ExternalReporterId => reporterId;
        public string? LineUserId => lineUserId;
        public bool IsAuthenticated => true;
    }

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => Task.FromResult(responseFactory(request));
    }
}
