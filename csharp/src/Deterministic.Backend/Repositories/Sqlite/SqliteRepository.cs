namespace Deterministic.Backend.Repositories.Sqlite;

public class SqliteRepository : IRepository
{
    protected SqliteDatasource Datasource { get; }

    public SqliteRepository(SqliteDatasource datasource)
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
