using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.InMemory;

namespace Deterministic.Backend.Tests;

public class InMemoryRepositoryTests
{
    [Fact]
    public async Task QueryAsync_Throws_Unimplemented()
    {
        var repo = new InMemoryRepository();
        await Assert.ThrowsAsync<UnimplementedException>(() => repo.QueryAsync("SELECT 1"));
    }
}
