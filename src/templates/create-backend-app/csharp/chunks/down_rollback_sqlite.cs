private static async Task<int> RollbackSqliteAsync(string migratePath, string connection)
{
    await using var conn = new SqliteConnection(ProviderConnectionString.Sqlite(connection));
    await conn.OpenAsync().ConfigureAwait(false);

    var name = await LoadLastAppliedAsync(conn, @"SELECT ""name"" FROM ""migrates"" ORDER BY ""name"" DESC LIMIT 1").ConfigureAwait(false);
    if (name is null)
    {
        Console.WriteLine("No applied migrations to roll back.");
        return 0;
    }
    var path = FindDownFile(migratePath, name)
        ?? throw new FileNotFoundException($"Cannot roll back \"{name}\": no <stem>_down.sql sibling found");
    var sql = await File.ReadAllTextAsync(path).ConfigureAwait(false);

    await using var tx = (SqliteTransaction)await conn.BeginTransactionAsync().ConfigureAwait(false);
    foreach (var stmt in MigrateUp.SplitStatements(sql))
    {
        await ExecuteAsync(conn, tx, stmt).ConfigureAwait(false);
    }
    await using (var del = conn.CreateCommand())
    {
        del.Transaction = tx;
        del.CommandText = @"DELETE FROM ""migrates"" WHERE ""name"" = $p1";
        AddParam(del, "$p1", name);
        await del.ExecuteNonQueryAsync().ConfigureAwait(false);
    }
    await tx.CommitAsync().ConfigureAwait(false);
    Console.WriteLine($"Rolled back: {name}");
    return 0;
}
