using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.SqlServer;

public class SqlServerCrudRepository : ICrudRepository
{
    protected SqlServerDatasource Datasource { get; }
    protected string TableName { get; }

    public SqlServerCrudRepository(SqlServerDatasource datasource, string tableName)
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
        var sql = SqlBuilder.BuildSelectById(Dialect.SqlServer, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectAll(Dialect.SqlServer, TableName);
        return Datasource.QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectByColumn(Dialect.SqlServer, TableName, column);
        return Datasource.QueryAsync(sql, new[] { value }, cancellationToken);
    }

    public virtual Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        _ = SqlBuilder.BuildInsert(Dialect.SqlServer, TableName, data.Keys.ToList());
        throw new UnimplementedException("SqlServerCrudRepository.AddAsync live driver is not wired");
    }

    public virtual Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        if (data.Count > 0)
        {
            _ = SqlBuilder.BuildUpdate(Dialect.SqlServer, TableName, data.Keys.ToList());
        }
        _ = id;
        throw new UnimplementedException("SqlServerCrudRepository.UpdateAsync live driver is not wired");
    }

    public Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        _ = SqlBuilder.BuildDelete(Dialect.SqlServer, TableName);
        _ = id;
        throw new UnimplementedException("SqlServerCrudRepository.DeleteAsync live driver is not wired");
    }
}
