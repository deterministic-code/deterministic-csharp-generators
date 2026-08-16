using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.SqlServer;

public sealed class SqlServerSetup : ISetup
{
    private readonly SqlServerDatasource datasource;
    private readonly string? migrationsDir;
    private readonly string? seedFile;

    public SqlServerSetup(
        SqlServerDatasource datasource,
        string? migrationsDir = null,
        string? seedFile = null)
    {
        this.datasource = datasource ?? throw new ArgumentNullException(nameof(datasource));
        this.migrationsDir = migrationsDir;
        this.seedFile = seedFile;
    }

    public Task RunAsync(CancellationToken cancellationToken = default)
    {
        _ = migrationsDir;
        _ = seedFile;
        _ = datasource;
        throw new UnimplementedException("SqlServerSetup is not wired in this build");
    }
}
