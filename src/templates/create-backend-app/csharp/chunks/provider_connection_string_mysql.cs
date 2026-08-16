public static string Mysql(string connection)
{
    if (!LooksLikeUrl(connection, "mysql"))
    {
        return connection;
    }
    var uri = new Uri(connection);
    var builder = new MySqlConnectionStringBuilder
    {
        Server = uri.Host,
        Port = (uint)(uri.Port > 0 ? uri.Port : 3306),
    };
    var (user, pass) = SplitUserInfo(uri.UserInfo);
    if (user is not null) { builder.UserID = user; }
    if (pass is not null) { builder.Password = pass; }
    var db = TrimLeadingSlash(uri.AbsolutePath);
    if (!string.IsNullOrEmpty(db)) { builder.Database = db; }
    foreach (var kv in ParseQuery(uri.Query))
    {
        builder[kv.Key] = kv.Value;
    }
    return builder.ToString();
}
