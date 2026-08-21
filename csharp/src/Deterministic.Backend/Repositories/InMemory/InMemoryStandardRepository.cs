namespace Deterministic.Backend.Repositories.InMemory;

public sealed class InMemoryStandardRepository : InMemoryCrudRepository, IStandardCrudRepository
{
    public override Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default) =>
        base.AddAsync(StandardRow.WithCreateAudit(data), cancellationToken);

    public override Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default) =>
        base.UpdateAsync(id, StandardRow.WithUpdateAudit(data), cancellationToken);
}
