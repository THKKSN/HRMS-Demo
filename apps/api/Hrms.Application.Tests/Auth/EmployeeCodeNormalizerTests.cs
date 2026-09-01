using FluentAssertions;
using Hrms.Application.Common.Helpers;

namespace Hrms.Application.Tests.Auth;

/// <summary>
/// กฎในนี้ต้องตรงกับ scripts/pad-employee-code-to-5.sql ทุกกรณี
/// ถ้าไม่ตรง พนักงานจะล็อกอินไม่ได้แบบไม่มี error ให้เห็น
/// </summary>
public sealed class EmployeeCodeNormalizerTests
{
    [Theory]
    [InlineData("  123  ", "00123")]
    [InlineData("123", "00123")]
    [InlineData("00123", "00123")]
    [InlineData("000123", "00123")]
    [InlineData("7644", "07644")]
    [InlineData("07644", "07644")]
    [InlineData("9905", "09905")]
    [InlineData("17", "00017")]
    [InlineData("00017", "00017")]
    [InlineData("7", "00007")]
    [InlineData("0", "00000")]
    [InlineData("0000", "00000")]
    public void Normalize_ShouldPadOneToFourDigitCodesToFive(string typed, string expected)
    {
        EmployeeCodeNormalizer.Normalize(typed).Should().Be(expected);
    }

    [Theory]
    [InlineData("SYSADMIN", "SYSADMIN")]
    [InlineData("EMP001", "EMP001")]
    [InlineData("00A12", "00A12")]
    [InlineData("  EMP-7 ", "EMP-7")]
    public void Normalize_ShouldOnlyTrimNonNumericCodes(string typed, string expected)
    {
        EmployeeCodeNormalizer.Normalize(typed).Should().Be(expected);
    }

    [Theory]
    [InlineData("123456", "123456")]
    [InlineData("0123456", "123456")]
    public void Normalize_ShouldStripZerosWithoutPaddingFiveDigitsOrMore(
        string typed,
        string expected)
    {
        EmployeeCodeNormalizer.Normalize(typed).Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Normalize_ShouldReturnEmptyForBlankInput(string? typed)
    {
        EmployeeCodeNormalizer.Normalize(typed!).Should().BeEmpty();
    }

    [Theory]
    [InlineData("123")]
    [InlineData("07644")]
    [InlineData("SYSADMIN")]
    [InlineData("12")]
    public void Normalize_ShouldBeIdempotent(string typed)
    {
        var once = EmployeeCodeNormalizer.Normalize(typed);

        EmployeeCodeNormalizer.Normalize(once).Should().Be(once);
    }
}
