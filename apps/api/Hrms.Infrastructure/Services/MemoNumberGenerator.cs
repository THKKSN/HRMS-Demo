using System.Data;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class MemoNumberGenerator(HrmsDbContext db) : IMemoNumberGenerator
{
    public async Task<string> NextAsync(DateOnly date, CancellationToken ct = default)
    {
        var month = date.ToString("yyyyMM");
        var connection = db.Database.GetDbConnection();
        var closeAfter = connection.State != ConnectionState.Open;
        if (closeAfter) await connection.OpenAsync(ct);
        try
        {
            await using (var increment = connection.CreateCommand())
            {
                increment.CommandText = """
                    INSERT INTO memo_monthly_sequences (sequence_month, last_number)
                    VALUES (@month, LAST_INSERT_ID(1))
                    ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)
                    """;
                var parameter = increment.CreateParameter();
                parameter.ParameterName = "@month";
                parameter.DbType = DbType.String;
                parameter.Value = month;
                increment.Parameters.Add(parameter);
                await increment.ExecuteNonQueryAsync(ct);
            }

            await using var current = connection.CreateCommand();
            current.CommandText = "SELECT LAST_INSERT_ID()";
            var value = await current.ExecuteScalarAsync(ct);
            var number = Convert.ToInt32(value);
            return $"Memo-{date:yyyyMMdd}-{number:0000}";
        }
        finally
        {
            if (closeAfter) await connection.CloseAsync();
        }
    }
}
