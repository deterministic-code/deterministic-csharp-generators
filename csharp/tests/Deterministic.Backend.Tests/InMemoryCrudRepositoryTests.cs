using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.InMemory;

namespace Deterministic.Backend.Tests;

public class InMemoryCrudRepositoryTests
{
    [Fact]
    public async Task QueryAsync_Throws_Unimplemented()
    {
        var repo = new InMemoryCrudRepository();
        await Assert.ThrowsAsync<UnimplementedException>(() => repo.QueryAsync("SELECT 1"));
    }

    [Fact]
    public async Task FullCrudLifecycle()
    {
        var repo = new InMemoryCrudRepository();
        Assert.Empty(await repo.FindAllAsync());

        var alice = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "alice" });
        var bob = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "bob" });

        Assert.Equal(1L, Convert.ToInt64(alice["id"]));
        Assert.Equal(2L, Convert.ToInt64(bob["id"]));

        var found = await repo.FindAsync(1);
        Assert.NotNull(found);
        Assert.Equal("alice", found!["name"]);

        Assert.Null(await repo.FindAsync(99));

        var all = await repo.FindAllAsync();
        Assert.Equal(2, all.Count);

        var byName = await repo.FindByAsync("name", "bob");
        Assert.Single(byName);
        Assert.Equal("bob", byName[0]["name"]);

        Assert.Empty(await repo.FindByAsync("name", "missing"));

        var updated = await repo.UpdateAsync(1, new Dictionary<string, object?> { ["name"] = "alicia" });
        Assert.NotNull(updated);
        Assert.Equal("alicia", updated!["name"]);
        Assert.Equal(1L, Convert.ToInt64(updated["id"]));

        Assert.Null(await repo.UpdateAsync(99, new Dictionary<string, object?> { ["name"] = "ghost" }));

        Assert.True(await repo.DeleteAsync(2));
        Assert.False(await repo.DeleteAsync(2));

        var remaining = await repo.FindAllAsync();
        Assert.Single(remaining);
    }

    [Fact]
    public async Task UpdateAsync_DoesNotChangeId()
    {
        var repo = new InMemoryCrudRepository();
        var row = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "x" });
        var rowId = Convert.ToInt64(row["id"]);

        var updated = await repo.UpdateAsync(
            rowId,
            new Dictionary<string, object?> { ["id"] = 999L, ["name"] = "y" });
        Assert.NotNull(updated);
        Assert.Equal(rowId, Convert.ToInt64(updated!["id"]));
        Assert.Equal("y", updated["name"]);
    }

    [Fact]
    public async Task FindAsync_ReturnsCopy()
    {
        var repo = new InMemoryCrudRepository();
        await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "x" });
        var row = await repo.FindAsync(1);
        Assert.NotNull(row);
        row!["name"] = "mutated";
        var again = await repo.FindAsync(1);
        Assert.NotNull(again);
        Assert.Equal("x", again!["name"]);
    }

    [Fact]
    public async Task DeleteAsync_OnMissing_ReturnsFalse()
    {
        var repo = new InMemoryCrudRepository();
        Assert.False(await repo.DeleteAsync(1));
    }
}
