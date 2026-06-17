using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class LineAuthService(HttpClient http, IOptions<LineOptions> options) : ILineAuthService
{
    private readonly LineOptions _opt = options.Value;

    public async Task<LineProfile> VerifyAccessTokenAsync(string accessToken, CancellationToken ct)
    {
        // 1) verify token belongs to our channel and is still valid
        var verifyResp = await http.GetAsync(
            $"https://api.line.me/oauth2/v2.1/verify?access_token={Uri.EscapeDataString(accessToken)}", ct);

        if (!verifyResp.IsSuccessStatusCode)
        {
            var body = await verifyResp.Content.ReadAsStringAsync(ct);
            throw new AppUnauthorizedException($"Invalid LINE access token. Status={verifyResp.StatusCode} Body={body}");
        }

        var verify = await verifyResp.Content.ReadFromJsonAsync<LineVerifyResponse>(ct);
        if (verify is null || verify.ClientId != _opt.ChannelId)
            throw new AppUnauthorizedException("LINE access token channel mismatch.");

        if (verify.ExpiresIn <= 0)
            throw new AppUnauthorizedException("LINE access token expired.");

        // 2) fetch the verified profile (userId guaranteed by LINE)
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.line.me/v2/profile");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var profileResp = await http.SendAsync(req, ct);
        if (!profileResp.IsSuccessStatusCode)
            throw new AppUnauthorizedException("Cannot fetch LINE profile.");

        var profile = await profileResp.Content.ReadFromJsonAsync<LineProfileResponse>(ct);
        if (profile is null || string.IsNullOrEmpty(profile.UserId))
            throw new AppUnauthorizedException("LINE profile is empty.");

        return new LineProfile(profile.UserId, profile.DisplayName, profile.PictureUrl);
    }

    private sealed class LineVerifyResponse
    {
        [JsonPropertyName("scope")] public string? Scope { get; set; }
        [JsonPropertyName("client_id")] public string? ClientId { get; set; }
        [JsonPropertyName("expires_in")] public long ExpiresIn { get; set; }
    }

    private sealed class LineProfileResponse
    {
        [JsonPropertyName("userId")] public string UserId { get; set; } = string.Empty;
        [JsonPropertyName("displayName")] public string DisplayName { get; set; } = string.Empty;
        [JsonPropertyName("pictureUrl")] public string? PictureUrl { get; set; }
    }
}
