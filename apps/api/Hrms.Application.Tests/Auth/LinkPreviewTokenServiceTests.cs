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
        var service = CreateService(TimeSpan.FromMinutes(5));

        var token = service.Create(employeeId, "U-LINE-123");
        var identity = service.Validate(token);

        identity.Should().Be(new LinkPreviewIdentity(employeeId, "U-LINE-123"));
        token.Should().NotContain(employeeId.ToString());
        token.Should().NotContain("U-LINE-123");
    }

    [Fact]
    public void Validate_ShouldRejectTamperedToken()
    {
        var service = CreateService(TimeSpan.FromMinutes(5));
        var token = service.Create(Guid.NewGuid(), "U-LINE-123");
        var replacement = token[^1] == 'A' ? 'B' : 'A';

        service.Validate(token[..^1] + replacement).Should().BeNull();
        service.Validate("not-a-protected-token").Should().BeNull();
    }

    [Fact]
    public void Validate_ShouldRejectExpiredToken()
    {
        var service = CreateService(TimeSpan.FromMinutes(-1));

        var token = service.Create(Guid.NewGuid(), "U-LINE-123");

        service.Validate(token).Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_ShouldRejectBlankToken(string token)
    {
        CreateService(TimeSpan.FromMinutes(5)).Validate(token).Should().BeNull();
    }

    [Fact]
    public void Validate_ShouldRejectTokenFromAnotherPurpose()
    {
        var provider = CreateProvider();
        var service = new LinkPreviewTokenService(provider, TimeSpan.FromMinutes(5));
        var otherPurpose = provider.CreateProtector("Hrms.Auth.SomethingElse")
            .ToTimeLimitedDataProtector();

        var foreignToken = otherPurpose.Protect("{}", TimeSpan.FromMinutes(5));

        service.Validate(foreignToken).Should().BeNull();
    }

    private LinkPreviewTokenService CreateService(TimeSpan lifetime)
        => new(CreateProvider(), lifetime);

    private IDataProtectionProvider CreateProvider()
        => DataProtectionProvider.Create(
            new DirectoryInfo(_keysPath),
            options => options.SetApplicationName("Hrms.LineLink.Tests"));

    public void Dispose()
    {
        if (Directory.Exists(_keysPath)) Directory.Delete(_keysPath, recursive: true);
    }
}
