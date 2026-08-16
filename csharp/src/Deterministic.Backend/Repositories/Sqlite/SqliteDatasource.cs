using System.Data;
using Deterministic.Backend.Errors;
using Microsoft.Data.Sqlite;

namespace Deterministic.Backend.Repositories.Sqlite;

public sealed class SqliteDatasource : IDatasource
{
    private readonly string connectionString;
    private readonly IReadOnlyList<string> pragmas;
    private SqliteConnection? connection;

    public SqliteDatasource(string connectionString, IReadOnlyList<string>? pragmas = null)
    {
        this.connectionString = connectionString
            ?? throw new ArgumentNullException(nameof(connectionString));
        this.pragmas = pragmas ?? new[] { "journal_mode = WAL", "foreign_keys = ON" };
    }

    public async Task OpenAsync(CancellationToken cancellationToken = default)
    {
        if (connection is not null)
        {
            return;
        }
        connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        foreach (var pragma in pragmas)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = $"PRAGMA {pragma}";
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    public async Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        var conn = RequireOpen();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parameters is not null)
        {
            for (var i = 0; i < parameters.Count; i++)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = $"$p{i + 1}";
                p.Value = parameters[i] ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
        }

        if (IsReader(sql))
        {
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken)
                .ConfigureAwait(false);
            var rows = new List<RowMap>();
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                var row = new RowMap(reader.FieldCount);
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    row[reader.GetName(i)] = value;
                }
                rows.Add(row);
            }
            return rows;
        }

        var changes = await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        long lastInsertRowid;
        using (var idCmd = conn.CreateCommand())
        {
            idCmd.CommandText = "SELECT last_insert_rowid()";
            var raw = await idCmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            lastInsertRowid = raw is null
                ? 0
                : Convert.ToInt64(raw, CultureInfo.InvariantCulture);
        }
        return new List<RowMap>
        {
            new()
            {
                ["changes"] = (long)changes,
                ["last_insert_rowid"] = lastInsertRowid,
            },
        };
    }

    public async Task CloseAsync(CancellationToken cancellationToken = default)
    {
        if (connection is null)
        {
            return;
        }
        await connection.CloseAsync().ConfigureAwait(false);
        await connection.DisposeAsync().ConfigureAwait(false);
        connection = null;
    }

    public async ValueTask DisposeAsync()
    {
        await CloseAsync().ConfigureAwait(false);
    }

    public SqliteConnection Raw() => RequireOpen();

    private SqliteConnection RequireOpen()
    {
        if (connection is null || connection.State != ConnectionState.Open)
        {
            throw new NotOpenException("SqliteDatasource");
        }
        return connection;
    }

    private static bool IsReader(string sql)
    {
        var trimmed = sql.TrimStart();
        return trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("WITH", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("PRAGMA", StringComparison.OrdinalIgnoreCase);
    }
}
