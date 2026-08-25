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
    [Fact]
    public async Task Handler_ShouldSendOtpForPreviewBoundToVerifiedLineUser()
    {
        await using var db = CreateDb();
        var employee = Employee("00123");
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var previewTokens = Preview("preview-token", employee.Id, "U-LINE-123");
        var otp = new Mock<IOtpService>();
        otp.Setup(service => service.GenerateAndStoreAsync(
                employee.Id, "U-LINE-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync("123456");
        var messaging = new Mock<ILineMessagingService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, previewTokens.Object, otp.Object, messaging.Object);

        var result = await handler.Handle(
            new RequestOtpCommand("line-token", "preview-token"), default);

        result.Hint.Should().Be("OTP ส่งแล้ว กรุณาตรวจสอบ LINE ของคุณ");
        otp.VerifyAll();
        messaging.Verify(service => service.PushFlexMessageAsync(
            "U-LINE-123",
            It.Is<string>(message => message.Contains("123456")),
            It.IsAny<object>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Handler_ShouldRejectInvalidOrExpiredPreviewWithoutOtp(string? lineUserId)
    {
        await using var db = CreateDb();
        var previewTokens = new Mock<ILinkPreviewTokenService>();
        previewTokens.Setup(service => service.Validate("invalid-preview"))
            .Returns(lineUserId is null
                ? null
                : new LinkPreviewIdentity(Guid.NewGuid(), lineUserId));
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, previewTokens.Object, otp.Object,
            Mock.Of<ILineMessagingService>());

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", "invalid-preview"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
        VerifyNoOtp(otp);
    }

    [Fact]
    public async Task Handler_ShouldRejectPreviewBoundToAnotherLineUser()
    {
        await using var db = CreateDb();
        var previewTokens = Preview("preview-token", Guid.NewGuid(), "U-OTHER");
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, previewTokens.Object, otp.Object,
            Mock.Of<ILineMessagingService>());

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", "preview-token"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
        VerifyNoOtp(otp);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handler_ShouldRejectMissingOrInactiveEmployeeAfterPreview(
        bool employeeExists)
    {
        await using var db = CreateDb();
        Guid employeeId;
        if (employeeExists)
        {
            // มีพนักงานอยู่จริง แต่ถูกปิดใช้งานหลังออก preview token ไปแล้ว
            var employee = Employee("00123");
            employee.IsActive = false;
            db.Employees.Add(employee);
            await db.SaveChangesAsync();
            employeeId = employee.Id;
        }
        else
        {
            // preview token ชี้ไปยังพนักงานที่ไม่มีในระบบ
            employeeId = Guid.NewGuid();
        }
        var previewTokens = Preview("preview-token", employeeId, "U-LINE-123");
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db, VerifiedLine().Object, previewTokens.Object, otp.Object,
            Mock.Of<ILineMessagingService>());

        var action = () => handler.Handle(
            new RequestOtpCommand("line-token", "preview-token"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_OR_EXPIRED_PREVIEW");
        VerifyNoOtp(otp);
    }

    [Fact]
    public async Task Handler_ShouldPreserveAlreadyLinkedConflictAfterPreview()
    {
        await using var db = CreateDb();
        var employee = Employee("00123");
        employee.LineUserId = "U-EXISTING";
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var previewTokens = Preview("preview-token", employee.Id, "U-LINE-123");
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
        line.Setup(service => service.VerifyAccessTokenAsync(
                "bad-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
        var previewTokens = new Mock<ILinkPreviewTokenService>(MockBehavior.Strict);
        var handler = new RequestOtpHandler(
            Mock.Of<IApplicationDbContext>(), line.Object, previewTokens.Object,
            Mock.Of<IOtpService>(), Mock.Of<ILineMessagingService>());

        var action = () => handler.Handle(
            new RequestOtpCommand("bad-token", "preview-token"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_LINE_TOKEN");
        previewTokens.Verify(service => service.Validate(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Validator_ShouldAcceptAccessTokenWithPreviewToken()
    {
        var result = new RequestOtpCommandValidator()
            .Validate(new RequestOtpCommand("line-token", "preview-token"));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validator_ShouldRejectEmptyPreviewToken(string previewToken)
    {
        var result = new RequestOtpCommandValidator().Validate(
            new RequestOtpCommand("line-token", previewToken));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "PreviewToken");
    }

    [Fact]
    public void Validator_ShouldRejectEmptyAccessToken()
    {
        var result = new RequestOtpCommandValidator().Validate(
            new RequestOtpCommand("", "preview-token"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "AccessToken");
    }

    [Fact]
    public async Task LinkAccount_StillBindsVerifiedLineUserAfterOtpConfirmation()
    {
        await using var db = CreateDb();
        var employee = Employee("00123");
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

    private static Mock<ILinkPreviewTokenService> Preview(
        string token,
        Guid employeeId,
        string lineUserId)
    {
        var previewTokens = new Mock<ILinkPreviewTokenService>();
        previewTokens.Setup(service => service.Validate(token))
            .Returns(new LinkPreviewIdentity(employeeId, lineUserId));
        return previewTokens;
    }

    private static void VerifyNoOtp(Mock<IOtpService> otp)
        => otp.Verify(service => service.GenerateAndStoreAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"request-otp-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static Employee Employee(string employeeCode) => new()
    {
        CompanyId = Guid.NewGuid(),
        EmployeeCode = employeeCode,
        FirstName = "Auth",
        LastName = "Test",
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
