namespace Hrms.Application.Common.Validation;

public static class ThaiNationalId
{
    public static bool IsValid(string? value)
    {
        if (value is null || value.Length != 13 || value.Any(ch => ch is < '0' or > '9'))
            return false;

        var sum = 0;
        for (var index = 0; index < 12; index++)
            sum += (value[index] - '0') * (13 - index);

        var expectedCheckDigit = (11 - sum % 11) % 10;
        return expectedCheckDigit == value[12] - '0';
    }
}
