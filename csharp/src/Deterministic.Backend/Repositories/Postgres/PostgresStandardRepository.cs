namespace Deterministic.Backend.Repositories.Postgres;

public sealed class PostgresStandardRepository : PostgresCrudRepository, IStandardCrudRepository
{
    public PostgresStandardRepository(PostgresDatasource datasource, string tableName)
        : base(datasource, tableName)
    {
    }

    public override Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var now = UtcIsoNow();
        var enriched = new Dictionary<string, object?>(data)
        {
            ["uuid"] = Guid.NewGuid().ToString(),
            ["created"] = now,
            ["updated"] = now,
        };
        return base.AddAsync(enriched, cancellationToken);
    }

    public override Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var enriched = new Dictionary<string, object?>(data)
        {
            ["updated"] = UtcIsoNow(),
        };
        return base.UpdateAsync(id, enriched, cancellationToken);
    }

    private static string UtcIsoNow() =>
        DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
}
