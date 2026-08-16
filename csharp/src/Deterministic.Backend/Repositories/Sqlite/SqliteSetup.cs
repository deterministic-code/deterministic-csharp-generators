using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace Deterministic.Backend.Repositories.Sqlite;

public sealed class SqliteSetup : ISetup
{
    private static readonly Regex VersionedFileRegex =
        new("^V(\\d+)__.*\\.sql$", RegexOptions.Compiled);

    private const string SchemaMigrationsDdl =
        "CREATE TABLE IF NOT EXISTS schema_migrations (" +
        "version TEXT PRIMARY KEY, " +
        "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)";

    private readonly string connectionString;
    private readonly string? migrationsDir;
    private readonly string? seedFile;

    public SqliteSetup(string connectionString, string? migrationsDir = null, string? seedFile = null)
    {
        this.connectionString = connectionString
            ?? throw new ArgumentNullException(nameof(connectionString));
        this.migrationsDir = migrationsDir;
        this.seedFile = seedFile;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = new SqliteConnection(connectionString);
        await conn.OpenAsync(cancellationToken).ConfigureAwait(false);

        await ExecuteAsync(conn, "PRAGMA journal_mode = WAL", cancellationToken)
            .ConfigureAwait(false);
        await ExecuteAsync(conn, "PRAGMA foreign_keys = OFF", cancellationToken)
            .ConfigureAwait(false);
        await ExecuteAsync(conn, SchemaMigrationsDdl, cancellationToken)
            .ConfigureAwait(false);

        if (migrationsDir is not null)
        {
            await RunMigrationsAsync(conn, migrationsDir, cancellationToken)
                .ConfigureAwait(false);
        }

        if (seedFile is not null && File.Exists(seedFile))
        {
            var seed = await File.ReadAllTextAsync(seedFile, cancellationToken)
                .ConfigureAwait(false);
            seed = Regex.Replace(seed, "INSERT INTO", "INSERT OR IGNORE INTO", RegexOptions.IgnoreCase);
            await ExecuteAsync(conn, seed, cancellationToken).ConfigureAwait(false);
        }

        await ExecuteAsync(conn, "PRAGMA foreign_keys = ON", cancellationToken)
            .ConfigureAwait(false);
    }

    private static async Task RunMigrationsAsync(
        SqliteConnection conn,
        string directory,
        CancellationToken cancellationToken)
    {
        if (!Directory.Exists(directory))
        {
            return;
        }

        var setupFile = Path.Combine(directory, "setup.sql");
        if (File.Exists(setupFile))
        {
            var sql = await File.ReadAllTextAsync(setupFile, cancellationToken)
                .ConfigureAwait(false);
            await ExecuteAsync(conn, sql, cancellationToken).ConfigureAwait(false);
        }

        var files = Directory.EnumerateFiles(directory)
            .Select(Path.GetFileName)
            .Where(f => f is not null && VersionedFileRegex.IsMatch(f))
            .OrderBy(VersionOf)
            .ToList();

        var applied = new HashSet<string>(StringComparer.Ordinal);
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT version FROM schema_migrations";
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken)
                .ConfigureAwait(false);
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                applied.Add(reader.GetString(0));
            }
        }

        foreach (var fileName in files)
        {
            if (fileName is null)
            {
                continue;
            }
            var match = VersionedFileRegex.Match(fileName);
            var version = $"V{match.Groups[1].Value}";
            if (applied.Contains(version))
            {
                continue;
            }
            var sql = await File.ReadAllTextAsync(Path.Combine(directory, fileName), cancellationToken)
                .ConfigureAwait(false);
            await ExecuteAsync(conn, sql, cancellationToken).ConfigureAwait(false);
            await using var insertCmd = conn.CreateCommand();
            insertCmd.CommandText = "INSERT INTO schema_migrations (version) VALUES ($v)";
            var p = insertCmd.CreateParameter();
            p.ParameterName = "$v";
            p.Value = version;
            insertCmd.Parameters.Add(p);
            await insertCmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    private static async Task ExecuteAsync(
        SqliteConnection conn,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
    }

    private static int VersionOf(string? fileName)
    {
        if (fileName is null)
        {
            return 0;
        }
        var match = VersionedFileRegex.Match(fileName);
        return match.Success ? int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture) : 0;
    }
}
