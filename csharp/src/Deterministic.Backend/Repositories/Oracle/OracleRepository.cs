namespace Deterministic.Backend.Repositories.Oracle;

public class OracleRepository : IRepository
{
    protected OracleDatasource Datasource { get; }

    public OracleRepository(OracleDatasource datasource)
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
