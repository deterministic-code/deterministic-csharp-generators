using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.Oracle;

public sealed class OracleSetup : ISetup
{
    private readonly OracleDatasource datasource;
    private readonly string? migrationsDir;
    private readonly string? seedFile;

    public OracleSetup(
        OracleDatasource datasource,
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
        throw new UnimplementedException("OracleSetup is not wired in this build");
    }
}
