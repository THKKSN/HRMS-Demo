using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Auth.PreviewEmployeeLink;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Auth;

public sealed class PreviewEmployeeLinkTests
{
    [Fact]
    public async Task Preview_ShouldReturnOnlyNameAndProtectedTokenForActiveUnlinkedEmployee()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP001", active: true);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        tokens.Setup(service => service.Create(employee.Id, "U-LINE-123"))
            .Returns("preview-token");
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var result = await handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", "  EMP001  "), default);

        result.Should().Be(new PreviewEmployeeLinkResult("Auth Test", "preview-token", 300));
    }

    [Fact]
    public async Task Preview_ShouldVerifyLineBeforeReadingEmployees()
    {
        var db = new Mock<IApplicationDbContext>(MockBehavior.Strict);
        db.SetupGet(context => context.Employees)
            .Throws(new InvalidOperationException("EMPLOYEES_QUERY_BEFORE_LINE_VERIFICATION"));
        var line = new Mock<ILineAuthService>();
        line.Setup(service => service.VerifyAccessTokenAsync(
                "bad-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppUnauthorizedException("INVALID_LINE_TOKEN"));
        var tokens = new Mock<ILinkPreviewTokenService>();
        var handler = new PreviewEmployeeLinkHandler(db.Object, line.Object, tokens.Object);

        var action = () => handler.Handle(
            new PreviewEmployeeLinkCommand("bad-token", "EMP001"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("INVALID_LINE_TOKEN");
        db.VerifyGet(context => context.Employees, Times.Never);
        tokens.Verify(
            service => service.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("0123")]
    [InlineData("00123")]
    [InlineData("  00123  ")]
    public async Task Preview_ShouldMatchCanonicalStoredCodeFromAnyTypedForm(string typedCode)
    {
        await using var db = CreateDb();
        var employee = Employee("00123", active: true);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        tokens.Setup(service => service.Create(employee.Id, "U-LINE-123"))
            .Returns("preview-token");
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var result = await handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", typedCode), default);

        result.FullName.Should().Be("Auth Test");
        result.PreviewToken.Should().Be("preview-token");
    }

    [Fact]
    public async Task Preview_ShouldMatchNonNumericCodeWithoutPadding()
    {
        await using var db = CreateDb();
        var employee = Employee("SYSADMIN", active: true);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        tokens.Setup(service => service.Create(employee.Id, "U-LINE-123"))
            .Returns("preview-token");
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var result = await handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", " SYSADMIN "), default);

        result.PreviewToken.Should().Be("preview-token");
    }

    [Fact]
    public async Task Preview_ShouldRejectUnconvertedUnpaddedStoredCode()
    {
        // กันลำดับ deploy ผิด: ถ้ายังไม่รัน scripts/pad-employee-code-to-5.sql
        // รหัส 4 หลักที่ยังไม่ pad ต้อง fail แบบ generic ไม่ใช่หาเจอบางส่วน
        await using var db = CreateDb();
        db.Employees.Add(Employee("7644", active: true));
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var action = () => handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", "7644"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("EMPLOYEE_NOT_FOUND");
        tokens.Verify(
            service => service.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

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
        tokens.Verify(
            service => service.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Preview_ShouldIgnoreInactiveEmployeeWithTheSameCanonicalCode()
    {
        await using var db = CreateDb();
        db.Employees.Add(Employee("00123", active: false));
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var action = () => handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", "123"), default);

        await action.Should().ThrowAsync<AppUnauthorizedException>()
            .WithMessage("EMPLOYEE_NOT_FOUND");
        tokens.Verify(
            service => service.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Preview_ShouldPreserveAlreadyLinkedConflict()
    {
        await using var db = CreateDb();
        var employee = Employee("EMP001", active: true);
        employee.LineUserId = "U-OTHER";
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var tokens = new Mock<ILinkPreviewTokenService>();
        var handler = new PreviewEmployeeLinkHandler(db, VerifiedLine().Object, tokens.Object);

        var action = () => handler.Handle(
            new PreviewEmployeeLinkCommand("line-token", "EMP001"), default);

        var exception = await action.Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("ALREADY_LINKED");
        tokens.Verify(
            service => service.Create(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("123456789012345678901234567890123456789012345678901")]
    public void Validator_ShouldRejectEmptyOrOverlengthEmployeeCode(string employeeCode)
    {
        var result = new PreviewEmployeeLinkCommandValidator().Validate(
            new PreviewEmployeeLinkCommand("line-token", employeeCode));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "EmployeeCode");
    }

    [Fact]
    public void Validator_ShouldRejectMissingAccessToken()
    {
        var result = new PreviewEmployeeLinkCommandValidator().Validate(
            new PreviewEmployeeLinkCommand("", "EMP001"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "AccessToken");
    }

    [Fact]
    public void Validator_ShouldAcceptTrimmableFiftyCharacterCode()
    {
        var result = new PreviewEmployeeLinkCommandValidator().Validate(
            new PreviewEmployeeLinkCommand("line-token", $"  {new string('9', 50)}  "));

        result.IsValid.Should().BeTrue();
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"preview-employee-link-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static Employee Employee(string employeeCode, bool active) => new()
    {
        CompanyId = Guid.NewGuid(),
        EmployeeCode = employeeCode,
        FirstName = "Auth",
        LastName = "Test",
        IsActive = active
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
