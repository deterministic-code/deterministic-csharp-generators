using Deterministic.Backend.Errors;
using Microsoft.Data.SqlClient;

namespace Deterministic.Backend.Repositories.SqlServer;

public sealed class SqlServerDatasource : IDatasource
{
    private readonly string? connectionString;
    private SqlConnection? connection;

    public SqlServerDatasource(string? connectionString = null, SqlConnection? connection = null)
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
                "SqlServerDatasource requires either an existing SqlConnection or a connection string");
        }
        throw new UnimplementedException(
            "SqlServerDatasource live driver is not wired in this build");
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        if (connection is null)
        {
            throw new NotOpenException("SqlServerDatasource");
        }
        throw new UnimplementedException(
            "SqlServerDatasource.QueryAsync live driver is not wired in this build");
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
