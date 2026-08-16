namespace Deterministic.Backend.Repositories.SqlServer;

public class SqlServerRepository : IRepository
{
    protected SqlServerDatasource Datasource { get; }

    public SqlServerRepository(SqlServerDatasource datasource)
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
