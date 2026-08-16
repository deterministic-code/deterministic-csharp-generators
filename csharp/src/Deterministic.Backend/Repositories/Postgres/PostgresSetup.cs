using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Postgres;

public sealed class PostgresSetup : ISetup
{
    private readonly PostgresDatasource datasource;
    private readonly string? migrationsDir;
    private readonly string? seedFile;

    public PostgresSetup(
        PostgresDatasource datasource,
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
        throw new UnimplementedException("PostgresSetup is not wired in this build");
    }
}
