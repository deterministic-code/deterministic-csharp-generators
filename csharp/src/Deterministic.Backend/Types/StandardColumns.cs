namespace Deterministic.Backend.Types;

public static class StandardColumns
{
    public const string Id = "id";
    public const string Uuid = "uuid";
    public const string Created = "created";
    public const string Updated = "updated";

    public static readonly IReadOnlyCollection<string> All = new[] { Id, Uuid, Created, Updated };
}
