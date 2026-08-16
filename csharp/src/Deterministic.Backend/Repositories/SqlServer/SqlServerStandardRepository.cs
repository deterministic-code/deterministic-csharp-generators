namespace Deterministic.Backend.Repositories.SqlServer;

public sealed class SqlServerStandardRepository : SqlServerCrudRepository, IStandardCrudRepository
{
    public SqlServerStandardRepository(SqlServerDatasource datasource, string tableName)
        : base(datasource, tableName)
    {
    }
}
