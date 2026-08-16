case "{{Dialect}}":
    await using (var conn = new {{ConnCtor}}(ProviderConnectionString.{{CsName}}(connection{{Bang}})))
    {
        await ApplyAsync(conn, {{CsName}}MigratesDdl, {{CsName}}MigrateLogsDdl).ConfigureAwait(false);
    }
    break;
