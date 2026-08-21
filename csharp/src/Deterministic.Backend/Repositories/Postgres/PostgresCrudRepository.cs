namespace Deterministic.Backend.Repositories.Postgres;

public class PostgresCrudRepository : SqlCrudRepository
{
    public PostgresCrudRepository(PostgresDatasource datasource, string tableName)
        : base(datasource, Dialect.Postgres, tableName)
    {
    }

    public override async Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var columns = data.Keys.ToList();
        var values = columns.Select(c => data[c]).ToArray();
        var sql = SqlBuilder.BuildInsert(Dialect, TableName, columns);
        var rows = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        return rows[0];
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
        var values = columns.Select(c => data[c]).ToList();
        values.Add(id);
        var sql = SqlBuilder.BuildUpdate(Dialect, TableName, columns);
        var rows = await Datasource.QueryAsync(sql, values, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0 ? rows[0] : null;
    }

    public override async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var sql = SqlBuilder.BuildDelete(Dialect, TableName);
        var rows = await Datasource.QueryAsync(sql, new object?[] { id }, cancellationToken)
            .ConfigureAwait(false);
        return rows.Count > 0;
    }
}
