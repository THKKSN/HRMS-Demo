using FluentAssertions;
using Hrms.Infrastructure;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
}
