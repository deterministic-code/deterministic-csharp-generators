namespace Deterministic.Backend.Repositories;

public interface ICrudRepository : IRepository
{
    Task<RowMap?> FindAsync(long id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default);

    Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default);

    Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
