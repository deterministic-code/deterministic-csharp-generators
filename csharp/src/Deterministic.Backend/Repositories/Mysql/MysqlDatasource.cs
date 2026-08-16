using Deterministic.Backend.Errors;
using MySqlConnector;

namespace Deterministic.Backend.Repositories.Mysql;

public sealed class MysqlDatasource : IDatasource
{
    private readonly string? connectionString;
    private MySqlDataSource? dataSource;

    public MysqlDatasource(string? connectionString = null, MySqlDataSource? dataSource = null)
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
                "MysqlDatasource requires either an existing MySqlDataSource or a connection string");
        }
        throw new UnimplementedException(
            "MysqlDatasource live driver is not wired in this build");
    }

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        if (dataSource is null)
        {
            throw new NotOpenException("MysqlDatasource");
        }
        throw new UnimplementedException(
            "MysqlDatasource.QueryAsync live driver is not wired in this build");
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
