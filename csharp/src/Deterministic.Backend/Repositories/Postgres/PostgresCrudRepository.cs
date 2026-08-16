namespace Deterministic.Backend.Repositories.Postgres;

public class PostgresCrudRepository : ICrudRepository
{
    protected PostgresDatasource Datasource { get; }
    protected string TableName { get; }

    public PostgresCrudRepository(PostgresDatasource datasource, string tableName)
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
        var sql = SqlBuilder.BuildSelectById(Dialect.Postgres, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectAll(Dialect.Postgres, TableName);
        return Datasource.QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectByColumn(Dialect.Postgres, TableName, column);
        return Datasource.QueryAsync(sql, new[] { value }, cancellationToken);
    }

    public virtual async Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var columns = data.Keys.ToList();
        var values = columns.Select(c => data[c]).ToArray();
        var sql = SqlBuilder.BuildInsert(Dialect.Postgres, TableName, columns);
        var rows = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        return rows[0];
    }

    public virtual async Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        if (data.Count == 0)
        {
            return await FindAsync(id, cancellationToken).ConfigureAwait(false);
        }
        var columns = data.Keys.ToList();
        var values = columns.Select(c => data[c]).ToList();
        values.Add(id);
        var sql = SqlBuilder.BuildUpdate(Dialect.Postgres, TableName, columns);
        var rows = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildDelete(Dialect.Postgres, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0;
    }
}
