using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.Postgres;

namespace Deterministic.Backend.Tests.Postgres;

public class PostgresSqlTests
{
    [Fact]
    public async Task QueryWithoutOpen_ThrowsNotOpen()
    {
        var ds = new PostgresDatasource("Host=unused");
        await Assert.ThrowsAsync<NotOpenException>(() => ds.QueryAsync("SELECT 1"));
    }

    [Fact]
    public void OpenWithNoConfig_ThrowsNotOpen()
    {
        var ds = new PostgresDatasource();
        Assert.Throws<NotOpenException>(() => ds.OpenAsync().GetAwaiter().GetResult());
    }

    [Fact]
    public void CrudRepository_ValidatesTableName()
    {
        var ds = new PostgresDatasource("Host=unused");
        Assert.Throws<InvalidIdentifierException>(() => new PostgresCrudRepository(ds, "Bad-Name"));
    }

    [Fact]
    public void StandardRepository_ValidatesTableName()
    {
        var ds = new PostgresDatasource("Host=unused");
        Assert.Throws<InvalidIdentifierException>(() => new PostgresStandardRepository(ds, "Bad-Name"));
    }

    [Fact]
    public async Task StandardRepository_FindWithoutOpen_ThrowsNotOpen()
    {
        var ds = new PostgresDatasource("Host=unused");
        var repo = new PostgresStandardRepository(ds, "users");
        await Assert.ThrowsAsync<NotOpenException>(() => repo.FindAsync(1));
    }
}
