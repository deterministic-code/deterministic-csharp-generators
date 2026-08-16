if (provider == "sqlite")
{
    var sqlitePath = ProviderConnectionString.SqliteFilesystemPath(connection);
    if (sqlitePath is not null && !File.Exists(sqlitePath))
    {
        Console.Error.WriteLine(
            $"sqlite file: {sqlitePath} does not exist — run 'migrate-setup --provider sqlite --connection {sqlitePath}' to create it");
        return 2;
    }
}
