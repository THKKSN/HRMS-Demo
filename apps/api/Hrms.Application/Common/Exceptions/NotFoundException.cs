namespace Hrms.Application.Common.Exceptions;

public class NotFoundException(string entityName, object id)
    : Exception($"ไม่พบ {entityName} (id: {id})")
{
    public string EntityName { get; } = entityName;
    public object Id { get; } = id;
}
