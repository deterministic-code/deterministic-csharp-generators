using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.Oracle;

namespace Deterministic.Backend.Tests.Oracle;

public class OracleSqlTests
{
    [Fact]
    public async Task QueryWithoutOpen_ThrowsNotOpen()
    {
        var ds = new OracleDatasource("DataSource=unused");
        await Assert.ThrowsAsync<NotOpenException>(() => ds.QueryAsync("SELECT 1"));
    }

    [Fact]
    public void OpenWithNoConfig_ThrowsNotOpen()
    {
        var ds = new OracleDatasource();
        Assert.Throws<NotOpenException>(() => ds.OpenAsync().GetAwaiter().GetResult());
    }

    [Fact]
    public void CrudRepository_ValidatesTableName()
    {
        var ds = new OracleDatasource("DataSource=unused");
        Assert.Throws<InvalidIdentifierException>(() => new OracleCrudRepository(ds, "Bad-Name"));
    }

    [Fact]
    public void StandardRepository_ValidatesTableName()
    {
        var ds = new OracleDatasource("DataSource=unused");
        Assert.Throws<InvalidIdentifierException>(() => new OracleStandardRepository(ds, "Bad-Name"));
    }
}
