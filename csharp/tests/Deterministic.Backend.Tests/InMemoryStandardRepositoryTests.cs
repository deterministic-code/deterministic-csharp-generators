using Deterministic.Backend.Repositories.InMemory;

namespace Deterministic.Backend.Tests;

public class InMemoryStandardRepositoryTests
{
    [Fact]
    public async Task AddAsync_PopulatesUuidCreatedUpdated()
    {
        var repo = new InMemoryStandardRepository();
        var row = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "alice" });

        Assert.True(row.ContainsKey("uuid"));
        Assert.False(string.IsNullOrEmpty(row["uuid"] as string));
        Assert.True(row.ContainsKey("created"));
        Assert.True(row.ContainsKey("updated"));
        Assert.Equal(row["created"], row["updated"]);
        Assert.Equal(1L, Convert.ToInt64(row["id"]));
    }

    [Fact]
    public async Task UpdateAsync_PreservesUuidAndCreated()
    {
        var repo = new InMemoryStandardRepository();
        var row = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "alice" });
        var originalUuid = row["uuid"] as string;
        var originalCreated = row["created"] as string;

        await Task.Delay(5);
        var updated = await repo.UpdateAsync(
            Convert.ToInt64(row["id"]),
            new Dictionary<string, object?> { ["name"] = "alicia" });

        Assert.NotNull(updated);
        Assert.Equal(originalUuid, updated!["uuid"]);
        Assert.Equal(originalCreated, updated["created"]);
        Assert.Equal("alicia", updated["name"]);
        Assert.NotEqual(originalCreated, updated["updated"]);
    }
}
