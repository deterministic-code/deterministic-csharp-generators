namespace Deterministic.Backend.Repositories.Mysql;

public class MysqlCrudRepository : SqlCrudRepository
{
    public MysqlCrudRepository(MysqlDatasource datasource, string tableName)
        : base(datasource, Dialect.Mysql, tableName)
    {
    }
}
