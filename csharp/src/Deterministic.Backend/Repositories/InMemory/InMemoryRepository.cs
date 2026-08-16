using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.InMemory;

public sealed class InMemoryRepository : IRepository
{
    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        throw new UnimplementedException("InMemory backend does not support raw SQL queries");
    }
}
