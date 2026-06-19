using System.Security.Cryptography;
using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class LineWebhookService(IOptions<LineOptions> options) : ILineWebhookService
{
    private readonly LineOptions _opts = options.Value;

    public bool VerifySignature(string body, string xLineSignature)
    {
        var key = Encoding.UTF8.GetBytes(_opts.ChannelSecret);
        using var hmac = new HMACSHA256(key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
        var expected = Convert.ToBase64String(hash);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(xLineSignature));
    }
}
