namespace Deterministic.Backend.Repositories.Postgres;

public sealed class PostgresStandardRepository : PostgresCrudRepository, IStandardCrudRepository
{
    public PostgresStandardRepository(PostgresDatasource datasource, string tableName)
        : base(datasource, tableName)
    {
    }

    public override Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default) =>
        base.AddAsync(StandardRow.WithCreateAudit(data), cancellationToken);

    public override Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default) =>
        base.UpdateAsync(id, StandardRow.WithUpdateAudit(data), cancellationToken);
}
