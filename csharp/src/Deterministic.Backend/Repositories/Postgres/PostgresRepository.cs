namespace Deterministic.Backend.Repositories.Postgres;

public class PostgresRepository : IRepository
{
    protected PostgresDatasource Datasource { get; }

    public PostgresRepository(PostgresDatasource datasource)
    {
        Datasource = datasource ?? throw new ArgumentNullException(nameof(datasource));
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        return Datasource.QueryAsync(sql, parameters, cancellationToken);
    }
}
