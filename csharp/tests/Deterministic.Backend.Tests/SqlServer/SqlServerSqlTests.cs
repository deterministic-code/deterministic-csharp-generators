using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.SqlServer;

namespace Deterministic.Backend.Tests.SqlServer;

public class SqlServerSqlTests
{
    [Fact]
    public async Task QueryWithoutOpen_ThrowsNotOpen()
    {
        var ds = new SqlServerDatasource("Server=unused");
        await Assert.ThrowsAsync<NotOpenException>(() => ds.QueryAsync("SELECT 1"));
    }

    [Fact]
    public void OpenWithNoConfig_ThrowsNotOpen()
    {
        var ds = new SqlServerDatasource();
        Assert.Throws<NotOpenException>(() => ds.OpenAsync().GetAwaiter().GetResult());
    }

    [Fact]
    public void CrudRepository_ValidatesTableName()
    {
        var ds = new SqlServerDatasource("Server=unused");
        Assert.Throws<InvalidIdentifierException>(() => new SqlServerCrudRepository(ds, "Bad-Name"));
    }

    [Fact]
    public void StandardRepository_ValidatesTableName()
    {
        var ds = new SqlServerDatasource("Server=unused");
        Assert.Throws<InvalidIdentifierException>(() => new SqlServerStandardRepository(ds, "Bad-Name"));
    }
}
