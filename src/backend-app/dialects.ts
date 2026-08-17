import { readFile } from "node:fs/promises";
import { fill } from "../common/fill.ts";

const chunk = async (name: string): Promise<string> =>
  (
    await readFile(
      new URL(`../templates/create-backend-app/csharp/chunks/${name}`, import.meta.url),
      "utf8",
    )
  ).trimEnd();

const filterChunks = (
  chunks: Record<string, string>,
  dialects: string[],
  joiner = "\n",
): string =>
  dialects
    .filter((d) => chunks[d])
    .map((d) => chunks[d])
    .join(joiner);

const CSHARP_DIALECT_PACKAGES: Record<string, { id: string; version: string }> =
  {
    sqlite: { id: "Microsoft.Data.Sqlite", version: "9.0.0" },
    postgres: { id: "Npgsql", version: "9.0.1" },
    mysql: { id: "MySqlConnector", version: "2.4.0" },
  };

const CSHARP_DIALECT_USINGS_LINES: Record<string, string> = {
  sqlite: "using Microsoft.Data.Sqlite;",
  mysql: "using MySqlConnector;",
  postgres: "using Npgsql;",
};

const [
  packagesTmpl,
  ddlConstsSqlite,
  ddlConstsPostgres,
  ddlConstsMysql,
  switchArmsTmpl,
  providerMethodPostgres,
  providerMethodMysql,
  providerUrlHelpers,
  sqlitePrecheck,
  upDispatchTmpl,
  downDispatchTmpl,
  upRunnerSqlite,
  upRunnerPostgres,
  upRunnerMysql,
  downRollbackSqlite,
  downRollbackPostgres,
  downRollbackMysql,
] = await Promise.all([
  chunk("packages.cs"),
  chunk("ddl_consts_sqlite.cs"),
  chunk("ddl_consts_postgres.cs"),
  chunk("ddl_consts_mysql.cs"),
  chunk("switch_arms.cs"),
  chunk("provider_connection_string_postgres.cs"),
  chunk("provider_connection_string_mysql.cs"),
  chunk("provider_connection_string_url_helpers.cs"),
  chunk("sqlite_precheck.cs"),
  chunk("up_dispatch_arms.cs"),
  chunk("down_dispatch_arms.cs"),
  chunk("up_runner_sqlite.cs"),
  chunk("up_runner_postgres.cs"),
  chunk("up_runner_mysql.cs"),
  chunk("down_rollback_sqlite.cs"),
  chunk("down_rollback_postgres.cs"),
  chunk("down_rollback_mysql.cs"),
]);

const CSHARP_PACKAGES_CHUNKS = {
  sqlite: fill(packagesTmpl, {
    Id: CSHARP_DIALECT_PACKAGES.sqlite.id,
    Version: CSHARP_DIALECT_PACKAGES.sqlite.version,
  }),
  postgres: fill(packagesTmpl, {
    Id: CSHARP_DIALECT_PACKAGES.postgres.id,
    Version: CSHARP_DIALECT_PACKAGES.postgres.version,
  }),
  mysql: fill(packagesTmpl, {
    Id: CSHARP_DIALECT_PACKAGES.mysql.id,
    Version: CSHARP_DIALECT_PACKAGES.mysql.version,
  }),
};

const CSHARP_DDL_CONSTS_CHUNKS = {
  sqlite: ddlConstsSqlite,
  postgres: ddlConstsPostgres,
  mysql: ddlConstsMysql,
};

const CSHARP_SWITCH_ARMS_CHUNKS = {
  sqlite: fill(switchArmsTmpl, {
    Dialect: "sqlite",
    ConnCtor: "SqliteConnection",
    CsName: "Sqlite",
    Bang: "",
  }),
  postgres: fill(switchArmsTmpl, {
    Dialect: "postgres",
    ConnCtor: "NpgsqlConnection",
    CsName: "Postgres",
    Bang: "!",
  }),
  mysql: fill(switchArmsTmpl, {
    Dialect: "mysql",
    ConnCtor: "MySqlConnection",
    CsName: "Mysql",
    Bang: "!",
  }),
};

const CSHARP_UP_DISPATCH_CHUNKS = {
  sqlite: fill(upDispatchTmpl, { Dialect: "sqlite", CsName: "Sqlite" }),
  postgres: fill(upDispatchTmpl, { Dialect: "postgres", CsName: "Postgres" }),
  mysql: fill(upDispatchTmpl, { Dialect: "mysql", CsName: "Mysql" }),
};

const CSHARP_DOWN_DISPATCH_CHUNKS = {
  sqlite: fill(downDispatchTmpl, { Dialect: "sqlite", CsName: "Sqlite" }),
  postgres: fill(downDispatchTmpl, { Dialect: "postgres", CsName: "Postgres" }),
  mysql: fill(downDispatchTmpl, { Dialect: "mysql", CsName: "Mysql" }),
};

const CSHARP_UP_RUNNER_CHUNKS = {
  sqlite: upRunnerSqlite,
  postgres: upRunnerPostgres,
  mysql: upRunnerMysql,
};

const CSHARP_DOWN_ROLLBACK_CHUNKS = {
  sqlite: downRollbackSqlite,
  postgres: downRollbackPostgres,
  mysql: downRollbackMysql,
};

export const csharpDialectPackagesContent = (dialects: string[]): string => {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const dialect of dialects) {
    const pkg = CSHARP_DIALECT_PACKAGES[dialect];
    if (!pkg) continue;
    if (seen.has(pkg.id)) continue;
    seen.add(pkg.id);
    lines.push(CSHARP_PACKAGES_CHUNKS[dialect as keyof typeof CSHARP_PACKAGES_CHUNKS]);
  }
  if (lines.length === 0) return "";
  return lines.join("\n") + "\n";
};

export const csharpDialectUsingsContent = (
  dialects: string[],
  opts: { includeSqlite: boolean } = { includeSqlite: true },
): string => {
  const includeSqlite = opts.includeSqlite;
  const lines: string[] = [];
  if (dialects.includes("sqlite") && includeSqlite) {
    lines.push(CSHARP_DIALECT_USINGS_LINES.sqlite);
  }
  if (dialects.includes("mysql")) lines.push(CSHARP_DIALECT_USINGS_LINES.mysql);
  if (dialects.includes("postgres"))
    lines.push(CSHARP_DIALECT_USINGS_LINES.postgres);
  return lines.join("\n");
};

export const csharpMigrateSetupDdlConstsContent = (dialects: string[]): string =>
  filterChunks(CSHARP_DDL_CONSTS_CHUNKS, dialects, "\n\n");

export const csharpMigrateSetupSwitchArmsContent = (
  dialects: string[],
): string => filterChunks(CSHARP_SWITCH_ARMS_CHUNKS, dialects, "\n");

export const csharpProviderConnectionStringMethodsContent = (
  dialects: string[],
): string => {
  const wantsPostgres = dialects.includes("postgres");
  const wantsMysql = dialects.includes("mysql");
  if (!wantsPostgres && !wantsMysql) return "";
  const out: string[] = [];
  if (wantsPostgres) out.push(providerMethodPostgres);
  if (wantsMysql) out.push(providerMethodMysql);
  out.push(providerUrlHelpers);
  return out.join("\n\n");
};

export const csharpMigrateSqlitePrecheckContent = (dialects: string[]): string =>
  dialects.includes("sqlite") ? sqlitePrecheck : "";

export const csharpMigrateUpDispatchArmsContent = (dialects: string[]): string =>
  filterChunks(CSHARP_UP_DISPATCH_CHUNKS, dialects, "\n");

export const csharpMigrateDownDispatchArmsContent = (
  dialects: string[],
): string => filterChunks(CSHARP_DOWN_DISPATCH_CHUNKS, dialects, "\n");

export const csharpMigrateUpRunnerMethodsContent = (
  dialects: string[],
): string => filterChunks(CSHARP_UP_RUNNER_CHUNKS, dialects, "\n\n");

export const csharpMigrateDownRollbackMethodsContent = (
  dialects: string[],
): string => filterChunks(CSHARP_DOWN_ROLLBACK_CHUNKS, dialects, "\n\n");
