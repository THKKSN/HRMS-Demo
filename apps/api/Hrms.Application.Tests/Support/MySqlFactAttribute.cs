namespace Hrms.Application.Tests.Support;

[AttributeUsage(AttributeTargets.Method)]
internal sealed class MySqlFactAttribute : FactAttribute
{
    public MySqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HRMS_MYSQL_TEST_CONNECTION")))
            Skip = "Set HRMS_MYSQL_TEST_CONNECTION to run tests against MySQL.";
    }
}
