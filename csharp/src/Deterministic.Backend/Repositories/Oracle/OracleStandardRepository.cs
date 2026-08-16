namespace Deterministic.Backend.Repositories.Oracle;

public sealed class OracleStandardRepository : OracleCrudRepository, IStandardCrudRepository
{
    public OracleStandardRepository(OracleDatasource datasource, string tableName)
        : base(datasource, tableName)
    {
    }
}
