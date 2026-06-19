namespace Hrms.Application.Common.Interfaces;

public interface ILineWebhookService
{
    bool VerifySignature(string body, string xLineSignature);
}
