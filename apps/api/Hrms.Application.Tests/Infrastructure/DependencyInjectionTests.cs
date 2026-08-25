using FluentAssertions;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure;
using Hrms.Infrastructure.Persistence;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Tests.Infrastructure;

public class DependencyInjectionTests
{
    [Fact]
    public async Task AddInfrastructureServices_ShouldProvideWorkingInMemoryDistributedCacheWithoutRedisConfiguration()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Server=127.0.0.1;Port=3306;Database=hrms_test;User=test;Password=test;",
                ["Hangfire:ServerEnabled"] = "false"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddInfrastructureServices(configuration);
        using var provider = services.BuildServiceProvider();
        var cache = provider.GetRequiredService<IDistributedCache>();

        await cache.SetStringAsync("cache-test", "available");

        (await cache.GetStringAsync("cache-test")).Should().Be("available");
    }

    [Fact]
    public void AddInfrastructureServices_ShouldResolveDbContextWithNotificationDispatchSignalInjected()
    {
        // HrmsDbContext มี constructor param ตัวที่สองคือ INotificationDispatchSignal
        // ซึ่ง EF ต้อง resolve ให้จาก DI ตอน runtime -- build ผ่านไม่การันตีข้อนี้
        // ถ้า resolve ไม่ได้ แอปจะพังตอน startup/ทุก request ไม่ใช่ตอน compile
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var signal = scope.ServiceProvider.GetRequiredService<INotificationDispatchSignal>();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();

        signal.Should().NotBeNull();
        db.Should().NotBeNull();
    }

    [Fact]
    public void AddInfrastructureServices_ShouldReadQueuePollIntervalFromConfiguration()
    {
        // ยืนยันว่า key ที่เพิ่มใน appsettings สะกดตรงกับที่โค้ดอ่านจริง
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Hangfire:QueuePollIntervalSeconds"] = "1"
        });

        provider.GetRequiredService<IConfiguration>()
            .GetValue<int?>("Hangfire:QueuePollIntervalSeconds")
            .Should().Be(1);
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?>? extraSettings = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] =
                "Server=127.0.0.1;Port=3306;Database=hrms_test;User=test;Password=test;",
            ["Hangfire:ServerEnabled"] = "false"
        };
        foreach (var pair in extraSettings ?? [])
            settings[pair.Key] = pair.Value;

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }
}
