namespace Deterministic.Backend.Repositories.Mysql;

public class MysqlRepository : IRepository
{
    protected MysqlDatasource Datasource { get; }

    public MysqlRepository(MysqlDatasource datasource)
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
