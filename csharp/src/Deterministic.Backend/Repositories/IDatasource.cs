namespace Deterministic.Backend.Repositories;

public interface IDatasource : IAsyncDisposable
{
    Task OpenAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default);

    Task CloseAsync(CancellationToken cancellationToken = default);
}
