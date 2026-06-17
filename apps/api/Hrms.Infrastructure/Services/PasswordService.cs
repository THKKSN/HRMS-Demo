using Hrms.Application.Common.Interfaces;
using BC = BCrypt.Net.BCrypt;

namespace Hrms.Infrastructure.Services;

public sealed class PasswordService : IPasswordService
{
    public string Hash(string plainPassword) =>
        BC.HashPassword(plainPassword, workFactor: 12);

    public bool Verify(string plainPassword, string hash) =>
        BC.Verify(plainPassword, hash);
}
