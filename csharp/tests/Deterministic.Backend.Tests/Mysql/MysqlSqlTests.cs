using Deterministic.Backend.Errors;
using Deterministic.Backend.Repositories.Mysql;

namespace Deterministic.Backend.Tests.Mysql;

public class MysqlSqlTests
{
    [Fact]
    public async Task QueryWithoutOpen_ThrowsNotOpen()
    {
        var ds = new MysqlDatasource("Server=unused");
        await Assert.ThrowsAsync<NotOpenException>(() => ds.QueryAsync("SELECT 1"));
    }

    [Fact]
    public void OpenWithNoConfig_ThrowsNotOpen()
    {
        var ds = new MysqlDatasource();
        Assert.Throws<NotOpenException>(() => ds.OpenAsync().GetAwaiter().GetResult());
    }

    [Fact]
    public void CrudRepository_ValidatesTableName()
    {
        var ds = new MysqlDatasource("Server=unused");
        Assert.Throws<InvalidIdentifierException>(() => new MysqlCrudRepository(ds, "Bad-Name"));
    }

    [Fact]
    public void StandardRepository_ValidatesTableName()
    {
        var ds = new MysqlDatasource("Server=unused");
        Assert.Throws<InvalidIdentifierException>(() => new MysqlStandardRepository(ds, "Bad-Name"));
    }
}
