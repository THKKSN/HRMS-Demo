namespace Hrms.Application.Common.Interfaces;

public interface ILineWebhookService
{
    bool VerifySignature(byte[] body, string xLineSignature);
}
