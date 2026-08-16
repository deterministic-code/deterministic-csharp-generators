private static async Task<int> RollbackMysqlAsync(string migratePath, string connection)
{
    await using var conn = new MySqlConnection(ProviderConnectionString.Mysql(connection));
    await conn.OpenAsync().ConfigureAwait(false);

    var name = await LoadLastAppliedAsync(conn, "SELECT `name` FROM `migrates` ORDER BY `name` DESC LIMIT 1").ConfigureAwait(false);
    if (name is null)
    {
        Console.WriteLine("No applied migrations to roll back.");
        return 0;
    }
    var path = FindDownFile(migratePath, name)
        ?? throw new FileNotFoundException($"Cannot roll back \"{name}\": no <stem>_down.sql sibling found");
    var sql = await File.ReadAllTextAsync(path).ConfigureAwait(false);

    // why no transaction: MySQL DDL auto-commits, so wrapping apply+DELETE gives no atomicity guarantee — mirror runUp's pattern.
    foreach (var stmt in MigrateUp.SplitStatements(sql))
    {
        await ExecuteAsync(conn, null, stmt).ConfigureAwait(false);
    }
    await using (var del = conn.CreateCommand())
    {
        del.CommandText = "DELETE FROM `migrates` WHERE `name` = @p1";
        AddParam(del, "@p1", name);
        await del.ExecuteNonQueryAsync().ConfigureAwait(false);
    }
    Console.WriteLine($"Rolled back: {name}");
    return 0;
}
