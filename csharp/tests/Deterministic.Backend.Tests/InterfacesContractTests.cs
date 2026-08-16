using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories;
using Deterministic.Backend.Repositories.InMemory;

namespace Deterministic.Backend.Tests;

public class InterfacesContractTests
{
    [Fact]
    public void IRepository_CanBeImplemented()
    {
        IRepository repo = new InMemoryRepository();
        Assert.NotNull(repo);
    }

    [Fact]
    public void ICrudRepository_CanBeImplemented()
    {
        ICrudRepository repo = new InMemoryCrudRepository();
        Assert.NotNull(repo);
    }

    [Fact]
    public void IStandardCrudRepository_CanBeImplemented()
    {
        IStandardCrudRepository repo = new InMemoryStandardRepository();
        Assert.NotNull(repo);
    }

    [Fact]
    public async Task IRepository_ConcreteThatThrows_PropagatesException()
    {
        var repo = new ThrowingRepository();
        await Assert.ThrowsAsync<UnimplementedException>(() => repo.QueryAsync("SELECT 1"));
    }

    [Fact]
    public async Task IDatasource_ConcreteThatThrows_PropagatesException()
    {
        IDatasource ds = new ThrowingDatasource();
        await Assert.ThrowsAsync<NotOpenException>(() => ds.QueryAsync("SELECT 1"));
        await ds.DisposeAsync();
    }

    [Fact]
    public async Task ISetup_ConcreteThatThrows_PropagatesException()
    {
        ISetup setup = new ThrowingSetup();
        await Assert.ThrowsAsync<UnimplementedException>(() => setup.RunAsync());
    }

    private sealed class ThrowingRepository : IRepository
    {
        public Task<IReadOnlyList<RowMap>> QueryAsync(
            string sql,
            IReadOnlyList<object?>? parameters = null,
            CancellationToken cancellationToken = default)
        {
            throw new UnimplementedException("throwing");
        }
    }

    private sealed class ThrowingDatasource : IDatasource
    {
        public Task OpenAsync(CancellationToken cancellationToken = default) =>
            throw new NotOpenException("ThrowingDatasource");

        public Task<IReadOnlyList<RowMap>> QueryAsync(
            string sql,
            IReadOnlyList<object?>? parameters = null,
            CancellationToken cancellationToken = default) =>
            throw new NotOpenException("ThrowingDatasource");

        public Task CloseAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class ThrowingSetup : ISetup
    {
        public Task RunAsync(CancellationToken cancellationToken = default) =>
            throw new UnimplementedException("throwing");
    }
}
