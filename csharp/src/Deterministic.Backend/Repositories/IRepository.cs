namespace Deterministic.Backend.Repositories;

public interface IRepository
{
    Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default);
}
