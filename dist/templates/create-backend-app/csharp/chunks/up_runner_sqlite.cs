private static async Task<int> RunSqliteAsync(string migratePath, string connection, bool one)
{
    await using var conn = new SqliteConnection(ProviderConnectionString.Sqlite(connection));
    await conn.OpenAsync().ConfigureAwait(false);

    var applied = await LoadAppliedAsync(conn, @"SELECT ""name"" FROM ""migrates""").ConfigureAwait(false);
    var appliedCount = 0;
    while (true)
    {
        if (!TryNext(migratePath, applied, out var name, out var path))
        {
            Console.WriteLine(appliedCount == 0 ? "No pending migrations." : "No more pending migrations.");
            return 0;
        }

        var sql = await File.ReadAllTextAsync(path).ConfigureAwait(false);
        var checksum = ChecksumHex(sql);

        await using (var tx = (SqliteTransaction)await conn.BeginTransactionAsync().ConfigureAwait(false))
        {
            foreach (var stmt in SplitStatements(sql))
            {
                await ExecuteAsync(conn, tx, stmt).ConfigureAwait(false);
            }
            await using (var ins = conn.CreateCommand())
            {
                ins.Transaction = tx;
                ins.CommandText = @"INSERT INTO ""migrates"" (""name"", ""checksum"") VALUES ($p1, $p2)";
                AddParam(ins, "$p1", name);
                AddParam(ins, "$p2", checksum);
                await ins.ExecuteNonQueryAsync().ConfigureAwait(false);
            }
            await tx.CommitAsync().ConfigureAwait(false);
        }
        Console.WriteLine($"Applied: {name}");
        applied.Add(name);
        appliedCount++;
        if (one) return 0;
    }
}
