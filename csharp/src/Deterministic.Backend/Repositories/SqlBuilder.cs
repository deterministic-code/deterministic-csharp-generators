namespace Deterministic.Backend.Repositories;

public static class SqlBuilder
{
    public static string Quote(this Dialect dialect, string name) => dialect switch
    {
        Dialect.Mysql => SqlIdentifier.QuoteMysqlIdentifier(name),
        Dialect.SqlServer => SqlIdentifier.QuoteSqlServerIdentifier(name),
        _ => SqlIdentifier.QuoteIdentifier(name),
    };

    public static string Placeholder(this Dialect dialect, int index) => dialect switch
    {
        Dialect.Sqlite => $"$p{index}",
        Dialect.Mysql => "?",
        Dialect.Postgres => $"${index}",
        Dialect.SqlServer => $"@p{index}",
        _ => $":{index}",
    };

    public static string IdEqPlaceholder(this Dialect dialect, int index) => dialect switch
    {
        Dialect.Sqlite => $"\"id\" = $p{index}",
        Dialect.Postgres => $"\"id\" = ${index}",
        Dialect.Mysql => "`id` = ?",
        Dialect.SqlServer => $"[id] = @p{index}",
        _ => $"\"id\" = :{index}",
    };

    public static string OrderById(this Dialect dialect) => dialect switch
    {
        Dialect.Mysql => "ORDER BY `id` ASC",
        Dialect.SqlServer => "ORDER BY [id] ASC",
        _ => "ORDER BY \"id\" ASC",
    };

    public static string BuildSelectById(Dialect dialect, string table)
    {
        var quoted = dialect.Quote(table);
        return $"SELECT * FROM {quoted} WHERE {dialect.IdEqPlaceholder(1)}";
    }

    public static string BuildSelectAll(Dialect dialect, string table)
    {
        var quoted = dialect.Quote(table);
        return $"SELECT * FROM {quoted} {dialect.OrderById()}";
    }

    public static string BuildSelectByColumn(Dialect dialect, string table, string column)
    {
        var tableQuoted = dialect.Quote(table);
        var columnQuoted = dialect.Quote(column);
        var placeholder = dialect.Placeholder(1);
        return
            $"SELECT * FROM {tableQuoted} WHERE {columnQuoted} = {placeholder} {dialect.OrderById()}";
    }

    public static string BuildInsert(Dialect dialect, string table, IReadOnlyList<string> columns)
    {
        ArgumentNullException.ThrowIfNull(columns);
        var tableQuoted = dialect.Quote(table);
        var quotedCols = string.Join(", ", columns.Select(c => dialect.Quote(c)));
        var placeholders = string.Join(
            ", ",
            Enumerable.Range(1, columns.Count).Select(i => dialect.Placeholder(i)));

        return dialect switch
        {
            Dialect.Postgres =>
                $"INSERT INTO {tableQuoted} ({quotedCols}) VALUES ({placeholders}) RETURNING *",
            Dialect.SqlServer =>
                $"INSERT INTO {tableQuoted} ({quotedCols}) OUTPUT INSERTED.* VALUES ({placeholders})",
            Dialect.Oracle =>
                $"INSERT INTO {tableQuoted} ({quotedCols}) VALUES ({placeholders}) RETURNING \"id\" INTO :{columns.Count + 1}",
            _ => $"INSERT INTO {tableQuoted} ({quotedCols}) VALUES ({placeholders})",
        };
    }

    public static string BuildUpdate(Dialect dialect, string table, IReadOnlyList<string> columns)
    {
        ArgumentNullException.ThrowIfNull(columns);
        var tableQuoted = dialect.Quote(table);
        var setClauses = string.Join(
            ", ",
            columns.Select((c, i) => $"{dialect.Quote(c)} = {dialect.Placeholder(i + 1)}"));
        var idIndex = columns.Count + 1;
        var idClause = dialect.IdEqPlaceholder(idIndex);

        return dialect switch
        {
            Dialect.Postgres =>
                $"UPDATE {tableQuoted} SET {setClauses} WHERE {idClause} RETURNING *",
            Dialect.SqlServer =>
                $"UPDATE {tableQuoted} SET {setClauses} OUTPUT INSERTED.* WHERE {idClause}",
            _ => $"UPDATE {tableQuoted} SET {setClauses} WHERE {idClause}",
        };
    }

    public static string BuildDelete(Dialect dialect, string table)
    {
        var tableQuoted = dialect.Quote(table);
        var idClause = dialect.IdEqPlaceholder(1);
        return dialect switch
        {
            Dialect.Postgres =>
                $"DELETE FROM {tableQuoted} WHERE {idClause} RETURNING \"id\"",
            Dialect.SqlServer =>
                $"DELETE FROM {tableQuoted} OUTPUT DELETED.[id] WHERE {idClause}",
            _ => $"DELETE FROM {tableQuoted} WHERE {idClause}",
        };
    }
}
