using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Oracle;

public class OracleCrudRepository : ICrudRepository
{
    protected OracleDatasource Datasource { get; }
    protected string TableName { get; }

    public OracleCrudRepository(OracleDatasource datasource, string tableName)
    {
        Datasource = datasource ?? throw new ArgumentNullException(nameof(datasource));
        SqlIdentifier.ValidateIdentifier(tableName);
        TableName = tableName;
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        return Datasource.QueryAsync(sql, parameters, cancellationToken);
    }

    public async Task<RowMap?> FindAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectById(Dialect.Oracle, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectAll(Dialect.Oracle, TableName);
        return Datasource.QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectByColumn(Dialect.Oracle, TableName, column);
        return Datasource.QueryAsync(sql, new[] { value }, cancellationToken);
    }

    public virtual Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        _ = SqlBuilder.BuildInsert(Dialect.Oracle, TableName, data.Keys.ToList());
        throw new UnimplementedException("OracleCrudRepository.AddAsync live driver is not wired");
    }

    public virtual Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        if (data.Count > 0)
        {
            _ = SqlBuilder.BuildUpdate(Dialect.Oracle, TableName, data.Keys.ToList());
        }
        _ = id;
        throw new UnimplementedException("OracleCrudRepository.UpdateAsync live driver is not wired");
    }

    public Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        _ = SqlBuilder.BuildDelete(Dialect.Oracle, TableName);
        _ = id;
        throw new UnimplementedException("OracleCrudRepository.DeleteAsync live driver is not wired");
    }
}
