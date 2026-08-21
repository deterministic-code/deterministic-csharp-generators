namespace Deterministic.Backend.Repositories.Oracle;

public class OracleCrudRepository : SqlCrudRepository
{
    public OracleCrudRepository(OracleDatasource datasource, string tableName)
        : base(datasource, Dialect.Oracle, tableName)
    {
    }
}
