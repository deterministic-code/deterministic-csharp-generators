using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Sqlite;

public class SqliteCrudRepository : ICrudRepository
{
    protected SqliteDatasource Datasource { get; }
    protected string TableName { get; }

    public SqliteCrudRepository(SqliteDatasource datasource, string tableName)
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
        var sql = SqlBuilder.BuildSelectById(Dialect.Sqlite, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectAll(Dialect.Sqlite, TableName);
        return Datasource.QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildSelectByColumn(Dialect.Sqlite, TableName, column);
        return Datasource.QueryAsync(
            sql,
            new[] { ToSqliteValue(value) },
            cancellationToken);
    }

    public virtual async Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var columns = data.Keys.ToList();
        var values = columns.Select(c => ToSqliteValue(data[c])).ToArray<object?>();
        var sql = SqlBuilder.BuildInsert(Dialect.Sqlite, TableName, columns);
        var result = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        var lastId = Convert.ToInt64(result[0]["last_insert_rowid"], CultureInfo.InvariantCulture);
        var row = await FindAsync(lastId, cancellationToken).ConfigureAwait(false);
        if (row is null)
        {
            throw new InsertedRowMissingException(lastId);
        }
        return row;
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
        var values = columns.Select(c => ToSqliteValue(data[c])).ToList();
        values.Add(id);
        var sql = SqlBuilder.BuildUpdate(Dialect.Sqlite, TableName, columns);
        var result = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        var changes = Convert.ToInt64(result[0]["changes"], CultureInfo.InvariantCulture);
        if (changes == 0)
        {
            return null;
        }
        return await FindAsync(id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildDelete(Dialect.Sqlite, TableName);
        var result = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        var changes = Convert.ToInt64(result[0]["changes"], CultureInfo.InvariantCulture);
        return changes > 0;
    }

    protected static object? ToSqliteValue(object? value) => value switch
    {
        bool b => b ? 1 : 0,
        DateTime dt => dt.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture),
        _ => value,
    };
}
