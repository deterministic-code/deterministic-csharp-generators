# Deterministic.Backend (C#)

C# / .NET 8 port of the `deterministic` repositories layer. See the
[root README](../README.md) for the canonical project overview and the cross-language
contract.

## Layout

- `src/Deterministic.Backend/` - library project
- `tests/Deterministic.Backend.Tests/` - xUnit tests

## Build & test

```bash
cd csharp
dotnet restore
dotnet build
dotnet test
dotnet format --verify-no-changes
```

## Driver tiers

| Backend  | Status | Driver |
|----------|--------|--------|
| sqlite   | live in-memory `:memory:` | `Microsoft.Data.Sqlite` |
| postgres | SQL strings only; runtime methods throw `UnimplementedException` | `Npgsql` |
| mysql    | SQL strings only; runtime methods throw `UnimplementedException` | `MySqlConnector` |
| sqlserver| SQL strings only; runtime methods throw `UnimplementedException` | `Microsoft.Data.SqlClient` |
| oracle   | SQL strings only; runtime methods throw `UnimplementedException` | `Oracle.ManagedDataAccess.Core` |

Live tiers are wired in follow-up PRs once CI infrastructure exists for spinning up real
databases.
