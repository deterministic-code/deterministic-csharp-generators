namespace Deterministic.Backend.Repositories.SqlServer;

public class SqlServerCrudRepository : SqlCrudRepository
{
    public SqlServerCrudRepository(SqlServerDatasource datasource, string tableName)
        : base(datasource, Dialect.SqlServer, tableName)
    {
    }
}
