using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Sqlite;

public class SqliteCrudRepository : SqlCrudRepository
{
    public SqliteCrudRepository(SqliteDatasource datasource, string tableName)
        : base(datasource, Dialect.Sqlite, tableName)
    {
    }

    protected override object? Bind(object? value) => value switch
    {
        bool b => b ? 1 : 0,
        DateTime dt => dt.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture),
        _ => value,
    };

    public override async Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var columns = data.Keys.ToList();
        var values = columns.Select(c => Bind(data[c])).ToArray<object?>();
        var sql = SqlBuilder.BuildInsert(Dialect, TableName, columns);
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

    public override async Task<RowMap?> UpdateAsync(
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
        var values = columns.Select(c => Bind(data[c])).ToList();
        values.Add(id);
        var sql = SqlBuilder.BuildUpdate(Dialect, TableName, columns);
        var result = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        var changes = Convert.ToInt64(result[0]["changes"], CultureInfo.InvariantCulture);
        if (changes == 0)
        {
            return null;
        }
        return await FindAsync(id, cancellationToken).ConfigureAwait(false);
    }

    public override async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildDelete(Dialect, TableName);
        var result = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        var changes = Convert.ToInt64(result[0]["changes"], CultureInfo.InvariantCulture);
        return changes > 0;
    }
}
