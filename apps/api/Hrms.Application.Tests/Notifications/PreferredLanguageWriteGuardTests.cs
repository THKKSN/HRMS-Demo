using FluentAssertions;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// กติกา "อัปเดตคอลัมน์เฉพาะตอนค่าเปลี่ยน ไม่เขียน DB ทุก request" (แผน notification-i18n งาน N2.1)
/// — header <c>X-Locale</c> มากับ<b>ทุก</b> request จึงต้องมีด่านนี้กั้นก่อนถึง DB
/// </summary>
public sealed class PreferredLanguageWriteGuardTests
{
    [Fact]
    public void WritesOnTheFirstRequestOfEachUser()
    {
        var guard = CreateGuard();

        guard.ShouldWrite("employee:A", "en").Should().BeTrue();
    }

    [Fact]
    public void SkipsEveryRequestAfterThatWhileTheLanguageStaysTheSame()
    {
        var guard = CreateGuard();
        guard.Remember("employee:A", "en");

        guard.ShouldWrite("employee:A", "en").Should().BeFalse();
        guard.ShouldWrite("employee:A", "en").Should().BeFalse();
    }

    [Fact]
    public void WritesAgainWhenTheUserSwitchesLanguage()
    {
        var guard = CreateGuard();
        guard.Remember("employee:A", "en");

        guard.ShouldWrite("employee:A", "th").Should().BeTrue();
    }

    /// <summary>คนละคนต้องไม่ใช้คำตอบร่วมกัน</summary>
    [Fact]
    public void RemembersEachUserSeparately()
    {
        var guard = CreateGuard();
        guard.Remember("employee:A", "en");

        guard.ShouldWrite("employee:B", "en").Should().BeTrue();
        guard.ShouldWrite("external:A", "en").Should().BeTrue();
    }

    private static PreferredLanguageWriteGuard CreateGuard()
        => new(new MemoryCache(new MemoryCacheOptions()));
}
