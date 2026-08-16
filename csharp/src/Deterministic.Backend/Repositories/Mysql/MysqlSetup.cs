using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Mysql;

public sealed class MysqlSetup : ISetup
{
    private readonly MysqlDatasource datasource;
    private readonly string? migrationsDir;
    private readonly string? seedFile;

    public MysqlSetup(
        MysqlDatasource datasource,
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
        throw new UnimplementedException("MysqlSetup is not wired in this build");
    }
}
