namespace Deterministic.Backend.Repositories.Mysql;

public sealed class MysqlStandardRepository : MysqlCrudRepository, IStandardCrudRepository
{
    public MysqlStandardRepository(MysqlDatasource datasource, string tableName)
        : base(datasource, tableName)
    {
    }
}
