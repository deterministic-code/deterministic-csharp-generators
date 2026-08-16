using Deterministic.Backend.Repositories;

namespace Deterministic.Backend.Tests;

public class SqlBuilderTests
{
    [Theory]
    [InlineData(Dialect.Sqlite, "SELECT * FROM \"users\" WHERE \"id\" = $p1")]
    [InlineData(Dialect.Postgres, "SELECT * FROM \"users\" WHERE \"id\" = $1")]
    [InlineData(Dialect.Mysql, "SELECT * FROM `users` WHERE `id` = ?")]
    [InlineData(Dialect.SqlServer, "SELECT * FROM [users] WHERE [id] = @p1")]
    [InlineData(Dialect.Oracle, "SELECT * FROM \"users\" WHERE \"id\" = :1")]
    public void BuildSelectById_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildSelectById(dialect, "users"));
    }

    [Theory]
    [InlineData(Dialect.Sqlite, "SELECT * FROM \"users\" ORDER BY \"id\" ASC")]
    [InlineData(Dialect.Postgres, "SELECT * FROM \"users\" ORDER BY \"id\" ASC")]
    [InlineData(Dialect.Mysql, "SELECT * FROM `users` ORDER BY `id` ASC")]
    [InlineData(Dialect.SqlServer, "SELECT * FROM [users] ORDER BY [id] ASC")]
    [InlineData(Dialect.Oracle, "SELECT * FROM \"users\" ORDER BY \"id\" ASC")]
    public void BuildSelectAll_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildSelectAll(dialect, "users"));
    }

    [Theory]
    [InlineData(Dialect.Sqlite, "SELECT * FROM \"users\" WHERE \"name\" = $p1 ORDER BY \"id\" ASC")]
    [InlineData(Dialect.Postgres, "SELECT * FROM \"users\" WHERE \"name\" = $1 ORDER BY \"id\" ASC")]
    [InlineData(Dialect.Mysql, "SELECT * FROM `users` WHERE `name` = ? ORDER BY `id` ASC")]
    [InlineData(Dialect.SqlServer, "SELECT * FROM [users] WHERE [name] = @p1 ORDER BY [id] ASC")]
    [InlineData(Dialect.Oracle, "SELECT * FROM \"users\" WHERE \"name\" = :1 ORDER BY \"id\" ASC")]
    public void BuildSelectByColumn_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildSelectByColumn(dialect, "users", "name"));
    }

    [Theory]
    [InlineData(Dialect.Sqlite, "INSERT INTO \"users\" (\"name\", \"age\") VALUES ($p1, $p2)")]
    [InlineData(Dialect.Postgres, "INSERT INTO \"users\" (\"name\", \"age\") VALUES ($1, $2) RETURNING *")]
    [InlineData(Dialect.Mysql, "INSERT INTO `users` (`name`, `age`) VALUES (?, ?)")]
    [InlineData(Dialect.SqlServer, "INSERT INTO [users] ([name], [age]) OUTPUT INSERTED.* VALUES (@p1, @p2)")]
    [InlineData(Dialect.Oracle, "INSERT INTO \"users\" (\"name\", \"age\") VALUES (:1, :2) RETURNING \"id\" INTO :3")]
    public void BuildInsert_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildInsert(dialect, "users", new[] { "name", "age" }));
    }

    [Theory]
    [InlineData(Dialect.Sqlite, "UPDATE \"users\" SET \"name\" = $p1, \"age\" = $p2 WHERE \"id\" = $p3")]
    [InlineData(Dialect.Postgres, "UPDATE \"users\" SET \"name\" = $1, \"age\" = $2 WHERE \"id\" = $3 RETURNING *")]
    [InlineData(Dialect.Mysql, "UPDATE `users` SET `name` = ?, `age` = ? WHERE `id` = ?")]
    [InlineData(Dialect.SqlServer, "UPDATE [users] SET [name] = @p1, [age] = @p2 OUTPUT INSERTED.* WHERE [id] = @p3")]
    [InlineData(Dialect.Oracle, "UPDATE \"users\" SET \"name\" = :1, \"age\" = :2 WHERE \"id\" = :3")]
    public void BuildUpdate_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildUpdate(dialect, "users", new[] { "name", "age" }));
    }

    [Theory]
    [InlineData(Dialect.Sqlite, "DELETE FROM \"users\" WHERE \"id\" = $p1")]
    [InlineData(Dialect.Postgres, "DELETE FROM \"users\" WHERE \"id\" = $1 RETURNING \"id\"")]
    [InlineData(Dialect.Mysql, "DELETE FROM `users` WHERE `id` = ?")]
    [InlineData(Dialect.SqlServer, "DELETE FROM [users] OUTPUT DELETED.[id] WHERE [id] = @p1")]
    [InlineData(Dialect.Oracle, "DELETE FROM \"users\" WHERE \"id\" = :1")]
    public void BuildDelete_Dialects(Dialect dialect, string expected)
    {
        Assert.Equal(expected, SqlBuilder.BuildDelete(dialect, "users"));
    }
}
