using Deterministic.Backend.Errors;
using Npgsql;

namespace Deterministic.Backend.Repositories.Postgres;

public sealed class PostgresDatasource : IDatasource
{
    private readonly string? connectionString;
    private NpgsqlDataSource? dataSource;

    public PostgresDatasource(string? connectionString = null, NpgsqlDataSource? dataSource = null)
    {
        this.connectionString = connectionString;
        this.dataSource = dataSource;
    }

    public Task OpenAsync(CancellationToken cancellationToken = default)
    {
        if (dataSource is not null)
        {
            return Task.CompletedTask;
        }
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new NotOpenException(
                "PostgresDatasource requires either an existing NpgsqlDataSource or a connection string");
        }
        throw new UnimplementedException(
            "PostgresDatasource live driver is not wired in this build");
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        if (dataSource is null)
        {
            throw new NotOpenException("PostgresDatasource");
        }
        throw new UnimplementedException(
            "PostgresDatasource.QueryAsync live driver is not wired in this build");
    }

    public Task CloseAsync(CancellationToken cancellationToken = default)
    {
        dataSource = null;
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        dataSource = null;
        return ValueTask.CompletedTask;
    }
}
