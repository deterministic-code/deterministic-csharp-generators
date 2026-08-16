public static string Postgres(string connection)
{
    if (!LooksLikeUrl(connection, "postgres", "postgresql"))
    {
        return connection;
    }
    var uri = new Uri(connection);
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
    };
    var (user, pass) = SplitUserInfo(uri.UserInfo);
    if (user is not null) { builder.Username = user; }
    if (pass is not null) { builder.Password = pass; }
    var db = TrimLeadingSlash(uri.AbsolutePath);
    if (!string.IsNullOrEmpty(db)) { builder.Database = db; }
    foreach (var kv in ParseQuery(uri.Query))
    {
        builder[kv.Key] = kv.Value;
    }
    return builder.ToString();
}
