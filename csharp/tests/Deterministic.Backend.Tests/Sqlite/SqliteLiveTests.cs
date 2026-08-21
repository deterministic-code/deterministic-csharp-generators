using Deterministic.Backend.Repositories.Sqlite;

namespace Deterministic.Backend.Tests.Sqlite;

public class SqliteLiveTests
{
    private static async Task<SqliteDatasource> MakeUsersDatasourceAsync()
    {
        var ds = new SqliteDatasource("Data Source=:memory:");
        await ds.OpenAsync();
        await ds.QueryAsync(
            "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL, age INTEGER NOT NULL)");
        return ds;
    }

    private static async Task<SqliteDatasource> MakeStandardDatasourceAsync()
    {
        var ds = new SqliteDatasource("Data Source=:memory:");
        await ds.OpenAsync();
        await ds.QueryAsync(
            "CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "uuid TEXT NOT NULL UNIQUE, name TEXT NOT NULL, " +
            "created TEXT NOT NULL, updated TEXT NOT NULL)");
        return ds;
    }

    [Fact]
    public async Task SqliteCrudLifecycle()
    {
        await using var ds = await MakeUsersDatasourceAsync();
        var repo = new SqliteCrudRepository(ds, "users");

        Assert.Empty(await repo.FindAllAsync());

        var alice = await repo.AddAsync(new Dictionary<string, object?>
        {
            ["name"] = "alice",
            ["age"] = 30L,
        });
        var bob = await repo.AddAsync(new Dictionary<string, object?>
        {
            ["name"] = "bob",
            ["age"] = 25L,
        });
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

        var updated = await repo.UpdateAsync(
            1,
            new Dictionary<string, object?> { ["name"] = "alicia" });
        Assert.NotNull(updated);
        Assert.Equal("alicia", updated!["name"]);

        Assert.Null(await repo.UpdateAsync(
            99,
            new Dictionary<string, object?> { ["name"] = "ghost" }));

        Assert.True(await repo.DeleteAsync(2));
        Assert.False(await repo.DeleteAsync(2));
    }

    [Fact]
    public async Task SqliteStandardLifecycle()
    {
        await using var ds = await MakeStandardDatasourceAsync();
        var repo = new SqliteStandardRepository(ds, "accounts");

        var row = await repo.AddAsync(new Dictionary<string, object?> { ["name"] = "alice" });
        Assert.Equal(1L, Convert.ToInt64(row["id"]));
        Assert.False(string.IsNullOrEmpty(row["uuid"] as string));
        Assert.Equal(row["created"], row["updated"]);

        await Task.Delay(5);
        var updated = await repo.UpdateAsync(
            Convert.ToInt64(row["id"]),
            new Dictionary<string, object?> { ["name"] = "alicia" });
        Assert.NotNull(updated);
        Assert.Equal(row["uuid"], updated!["uuid"]);
        Assert.Equal(row["created"], updated["created"]);
        Assert.Equal("alicia", updated["name"]);

        Assert.True(await repo.DeleteAsync(Convert.ToInt64(row["id"])));
        Assert.Empty(await repo.FindAllAsync());
    }

    [Fact]
    public async Task SqliteCrudRepository_QueryPassthrough()
    {
        await using var ds = await MakeUsersDatasourceAsync();
        var repo = new SqliteCrudRepository(ds, "users");
        await ds.QueryAsync(
            "INSERT INTO users (name, age) VALUES ($p1, $p2)",
            new object?[] { "alice", 30L });

        var rows = await repo.QueryAsync("SELECT name, age FROM users");
        Assert.Single(rows);
        Assert.Equal("alice", rows[0]["name"]);
    }
}
