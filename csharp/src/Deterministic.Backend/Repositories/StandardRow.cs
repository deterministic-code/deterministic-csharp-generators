namespace Deterministic.Backend.Repositories;

internal static class StandardRow
{
    public static Dictionary<string, object?> WithCreateAudit(IReadOnlyDictionary<string, object?> data)
    {
        ArgumentNullException.ThrowIfNull(data);
        var now = UtcIsoNow();
        return new Dictionary<string, object?>(data)
        {
            ["uuid"] = Guid.NewGuid().ToString(),
            ["created"] = now,
            ["updated"] = now,
        };
    }

    public static Dictionary<string, object?> WithUpdateAudit(IReadOnlyDictionary<string, object?> data)
    {
        ArgumentNullException.ThrowIfNull(data);
        return new Dictionary<string, object?>(data)
        {
            ["updated"] = UtcIsoNow(),
        };
    }

    public static string UtcIsoNow() =>
        DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
}
