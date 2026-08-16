using Deterministic.Backend.Errors;
using Oracle.ManagedDataAccess.Client;

namespace Deterministic.Backend.Repositories.Oracle;

public sealed class OracleDatasource : IDatasource
{
    private readonly string? connectionString;
    private OracleConnection? connection;

    public OracleDatasource(string? connectionString = null, OracleConnection? connection = null)
    {
        this.connectionString = connectionString;
        this.connection = connection;
    }

    public Task OpenAsync(CancellationToken cancellationToken = default)
    {
        if (connection is not null)
        {
            return Task.CompletedTask;
        }
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new NotOpenException(
                "OracleDatasource requires either an existing OracleConnection or a connection string");
        }
        throw new UnimplementedException(
            "OracleDatasource live driver is not wired in this build");
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        if (connection is null)
        {
            throw new NotOpenException("OracleDatasource");
        }
        throw new UnimplementedException(
            "OracleDatasource.QueryAsync live driver is not wired in this build");
    }

    public Task CloseAsync(CancellationToken cancellationToken = default)
    {
        connection = null;
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        connection = null;
        return ValueTask.CompletedTask;
    }
}
