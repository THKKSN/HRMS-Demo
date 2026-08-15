using System.Security.Cryptography;
using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class LineWebhookService(IOptions<LineOptions> options) : ILineWebhookService
{
    private readonly LineOptions _opts = options.Value;

    public bool VerifySignature(byte[] body, string xLineSignature)
    {
        var channelSecret = !string.IsNullOrWhiteSpace(_opts.MessagingChannelSecret)
            ? _opts.MessagingChannelSecret
            : _opts.ChannelSecret;

        if (string.IsNullOrWhiteSpace(channelSecret) ||
            string.IsNullOrWhiteSpace(xLineSignature))
        {
            return false;
        }

        var key = Encoding.UTF8.GetBytes(channelSecret);
        using var hmac = new HMACSHA256(key);
        var hash = hmac.ComputeHash(body);
        var expected = Convert.ToBase64String(hash);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(xLineSignature.Trim()));
    }
}
