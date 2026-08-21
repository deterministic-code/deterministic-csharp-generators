using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories;

public abstract class SqlCrudRepository : ICrudRepository
{
    protected IDatasource Datasource { get; }
    protected Dialect Dialect { get; }
    protected string TableName { get; }

    protected SqlCrudRepository(IDatasource datasource, Dialect dialect, string tableName)
    {
        Datasource = datasource ?? throw new ArgumentNullException(nameof(datasource));
        Dialect = dialect;
        SqlIdentifier.ValidateIdentifier(tableName);
        TableName = tableName;
    }

    protected virtual object? Bind(object? value) => value;

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        return Datasource.QueryAsync(sql, parameters, cancellationToken);
    }

    public async Task<RowMap?> FindAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectById(Dialect, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectAll(Dialect, TableName);
        return Datasource.QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectByColumn(Dialect, TableName, column);
        return Datasource.QueryAsync(sql, new[] { Bind(value) }, cancellationToken);
    }

    public virtual Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        _ = SqlBuilder.BuildInsert(Dialect, TableName, data.Keys.ToList());
        throw new UnimplementedException($"{GetType().Name}.AddAsync live driver is not wired");
    }

    public virtual Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        if (data.Count > 0)
        {
            _ = SqlBuilder.BuildUpdate(Dialect, TableName, data.Keys.ToList());
        }
        _ = id;
        throw new UnimplementedException($"{GetType().Name}.UpdateAsync live driver is not wired");
    }

    public virtual Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        _ = SqlBuilder.BuildDelete(Dialect, TableName);
        _ = id;
        throw new UnimplementedException($"{GetType().Name}.DeleteAsync live driver is not wired");
    }
}
