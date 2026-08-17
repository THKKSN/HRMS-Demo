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
    public async Task Handler_VerifiesLineTokenBeforeReadingEmployees()
    {
        var db = new Mock<IApplicationDbContext>(MockBehavior.Strict);
        db.SetupGet(context => context.Employees)
            .Throws(new InvalidOperationException("EMPLOYEES_QUERY_BEFORE_LINE_VERIFICATION"));
        var line = new Mock<ILineAuthService>();
        line.Setup(service => service.VerifyAccessTokenAsync(
                "bad-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
        var otp = new Mock<IOtpService>();
        var handler = new RequestOtpHandler(
            db.Object, line.Object, otp.Object, new Mock<ILineMessagingService>().Object);

        var action = () => handler.Handle(
            new RequestOtpCommand("bad-token", ValidNationalId), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_LINE_TOKEN");
        db.VerifyGet(context => context.Employees, Times.Never);
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
