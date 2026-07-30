using System.Data;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class TicketNumberGenerator(HrmsDbContext db) : ITicketNumberGenerator
{
    public async Task<string> NextAsync(DateOnly date, CancellationToken ct = default)
    {
        var connection = db.Database.GetDbConnection();
        var closeAfter = connection.State != ConnectionState.Open;
        if (closeAfter) await connection.OpenAsync(ct);
        try
        {
            await using (var increment = connection.CreateCommand())
            {
                increment.CommandText = """
                    INSERT INTO ticket_daily_sequences (sequence_date, last_number)
                    VALUES (@date, LAST_INSERT_ID(1))
                    ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)
                    """;
                var parameter = increment.CreateParameter();
                parameter.ParameterName = "@date";
                parameter.DbType = DbType.Date;
                parameter.Value = date.ToDateTime(TimeOnly.MinValue);
                increment.Parameters.Add(parameter);
                await increment.ExecuteNonQueryAsync(ct);
            }

            await using var current = connection.CreateCommand();
            current.CommandText = "SELECT LAST_INSERT_ID()";
            var value = await current.ExecuteScalarAsync(ct);
            var number = Convert.ToInt32(value);
            return $"TK-{date:yyyyMMdd}-{number:0000}";
        }
        finally
        {
            if (closeAfter) await connection.CloseAsync();
        }
    }
}
