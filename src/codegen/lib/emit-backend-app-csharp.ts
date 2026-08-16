import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEV_PORTS,
  buildAppModel,
  deriveCSharpProjectName,
} from "@deterministic-code/generator-sdk/create-backend-app-model";
import {
  makeChunkLoader,
  renderTemplate,
} from "@deterministic-code/generator-sdk/codegen/lib/chunk-loader";
import { PACK_TEMPLATES_DIR } from "../../pack-root.ts";

const { loadChunk, renderDialectMap } = makeChunkLoader(PACK_TEMPLATES_DIR);
import { filterChunks } from "@deterministic-code/generator-sdk/dialect-filter";
import { pathExists } from "@deterministic-code/generator-sdk/path-exists";
import {
  readSettingsWithDefault,
  type ParsedSettings,
} from "@deterministic-code/generator-sdk/read-settings";
import {
  COMPOSE_FILENAME,
  renderCSharpSingleComposeService,
  renderCSharpComposeService,
} from "@deterministic-code/generator-sdk/codegen/lib/compose-services";
import { isMultiLanguage } from "@deterministic-code/generator-sdk/codegen/lib/declared-languages";
import {
  PATCH,
  skeletonEntriesFromFiles,
  type EmitEntry,
} from "@deterministic-code/generator-sdk/codegen/lib/emit-result";
import { loadBackendAppInputs } from "@deterministic-code/generator-sdk/codegen/lib/backend-app-inputs";
import { makeBackendAppEmit } from "@deterministic-code/generator-sdk/codegen/lib/backend-app-emit-helpers";
import { COMBINED_FLAG } from "@deterministic-code/generator-sdk/codegen/lib/backend-lane";
import {
  DOCKERIGNORE_TRIGGER,
  dockerignoreSection,
} from "@deterministic-code/patch-merger";

type AppModel = ReturnType<typeof buildAppModel>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = resolve(
  PACK_TEMPLATES_DIR,
  "create-backend-app",
  "csharp",
  "App",
);

const CSHARP_DIALECT_PACKAGES: Record<string, { id: string; version: string }> =
  {
    sqlite: { id: "Microsoft.Data.Sqlite", version: "9.0.0" },
    postgres: { id: "Npgsql", version: "9.0.1" },
    mysql: { id: "MySqlConnector", version: "2.4.0" },
  };

const CSHARP_PACKAGES_TOKENS_BY_DIALECT = {
  sqlite: {
    Id: CSHARP_DIALECT_PACKAGES.sqlite.id,
    Version: CSHARP_DIALECT_PACKAGES.sqlite.version,
  },
  postgres: {
    Id: CSHARP_DIALECT_PACKAGES.postgres.id,
    Version: CSHARP_DIALECT_PACKAGES.postgres.version,
  },
  mysql: {
    Id: CSHARP_DIALECT_PACKAGES.mysql.id,
    Version: CSHARP_DIALECT_PACKAGES.mysql.version,
  },
};

const CSHARP_PACKAGES_CHUNKS = (await renderDialectMap(
  "csharp",
  "packages",
  CSHARP_PACKAGES_TOKENS_BY_DIALECT,
)) as Record<string, string>;

export function csharpDialectPackagesContent(dialects: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const dialect of dialects) {
    const pkg = CSHARP_DIALECT_PACKAGES[dialect];
    if (!pkg) continue;
    if (seen.has(pkg.id)) continue;
    seen.add(pkg.id);
    lines.push(CSHARP_PACKAGES_CHUNKS[dialect]);
  }
  if (lines.length === 0) return "";
  return lines.join("\n") + "\n";
}

export async function renderCSharpAppCsproj(model: AppModel): Promise<string> {
  const templatePath = resolve(templatesDir, "App.csproj.tmpl");
  return await renderTemplate(templatePath, {
    PROJECT_NAME: deriveCSharpProjectName(model),
  });
}

export async function renderCSharpProgram(model: AppModel): Promise<string> {
  const templatePath = resolve(templatesDir, "Program.cs.tmpl");
  return await renderTemplate(templatePath, {
    PROJECT_NAME: deriveCSharpProjectName(model),
  });
}

export async function renderCSharpDockerfile(
  model: AppModel,
  { multiLanguage }: { multiLanguage?: boolean } = {},
): Promise<string> {
  const templatePath = resolve(templatesDir, "Dockerfile.tmpl");
  // In multi-lang the root compose sets `context: .` + `dockerfile: ./csharp/Dockerfile`, so the lane-relative COPY lines (.csproj, the lane sources, scripts/entrypoint.sh) carry the `csharp/` prefix while root-shared sql/ stays reachable through the migrate-patched MIGRATE_COPY block.
  return await renderTemplate(templatePath, {
    PROJECT_NAME: deriveCSharpProjectName(model),
    MULTILANG_PREFIX: multiLanguage ? "csharp/" : "",
    COPY_ALL_SRC: multiLanguage ? "csharp" : ".",
  });
}

export async function renderCSharpAppsettings(env?: string): Promise<string> {
  const filename =
    env === "Development"
      ? "appsettings.Development.json.tmpl"
      : "appsettings.json.tmpl";
  const templatePath = resolve(templatesDir, filename);
  return await renderTemplate(templatePath, {});
}

export async function renderCSharpGitignoreSection(): Promise<string> {
  const templatePath = resolve(templatesDir, ".gitignore");
  return await readFile(templatePath, "utf8");
}

export function renderCSharpEnvSection(): string {
  return `ASPNETCORE_URLS=http://+:${DEV_PORTS.csharp}\n`;
}

export async function renderCSharpEntrypoint(): Promise<string> {
  return await readFile(resolve(templatesDir, "entrypoint.sh"), "utf8");
}

const CSHARP_DIALECT_USINGS_LINES: Record<string, string> = {
  sqlite: "using Microsoft.Data.Sqlite;",
  mysql: "using MySqlConnector;",
  postgres: "using Npgsql;",
};

export function csharpDialectUsingsContent(
  dialects: string[],
  opts: { includeSqlite?: boolean } = {},
): string {
  const includeSqlite = opts.includeSqlite !== false;
  const lines: string[] = [];
  if (dialects.includes("sqlite") && includeSqlite) {
    lines.push(CSHARP_DIALECT_USINGS_LINES.sqlite);
  }
  if (dialects.includes("mysql")) lines.push(CSHARP_DIALECT_USINGS_LINES.mysql);
  if (dialects.includes("postgres"))
    lines.push(CSHARP_DIALECT_USINGS_LINES.postgres);
  return lines.join("\n");
}

const CSHARP_DDL_CONSTS_CHUNKS = {
  sqlite: await loadChunk("csharp", "ddl_consts_sqlite"),
  postgres: await loadChunk("csharp", "ddl_consts_postgres"),
  mysql: await loadChunk("csharp", "ddl_consts_mysql"),
};

export function csharpMigrateSetupDdlConstsContent(dialects: string[]): string {
  return filterChunks(CSHARP_DDL_CONSTS_CHUNKS, dialects, "\n\n");
}

const CSHARP_SWITCH_ARMS_TOKENS_BY_DIALECT = {
  sqlite: {
    Dialect: "sqlite",
    ConnCtor: "SqliteConnection",
    CsName: "Sqlite",
    Bang: "",
  },
  postgres: {
    Dialect: "postgres",
    ConnCtor: "NpgsqlConnection",
    CsName: "Postgres",
    Bang: "!",
  },
  mysql: {
    Dialect: "mysql",
    ConnCtor: "MySqlConnection",
    CsName: "Mysql",
    Bang: "!",
  },
};

const CSHARP_SWITCH_ARMS_CHUNKS = (await renderDialectMap(
  "csharp",
  "switch_arms",
  CSHARP_SWITCH_ARMS_TOKENS_BY_DIALECT,
)) as Record<string, string>;

export function csharpMigrateSetupSwitchArmsContent(
  dialects: string[],
): string {
  return filterChunks(CSHARP_SWITCH_ARMS_CHUNKS, dialects, "\n");
}

const CSHARP_PROVIDER_METHOD_POSTGRES = await loadChunk(
  "csharp",
  "provider_connection_string_postgres",
);
const CSHARP_PROVIDER_METHOD_MYSQL = await loadChunk(
  "csharp",
  "provider_connection_string_mysql",
);
const CSHARP_PROVIDER_URL_HELPERS = await loadChunk(
  "csharp",
  "provider_connection_string_url_helpers",
);

export function csharpProviderConnectionStringMethodsContent(
  dialects: string[],
): string {
  const wantsPostgres = dialects.includes("postgres");
  const wantsMysql = dialects.includes("mysql");
  if (!wantsPostgres && !wantsMysql) return "";
  const out: string[] = [];
  if (wantsPostgres) out.push(CSHARP_PROVIDER_METHOD_POSTGRES);
  if (wantsMysql) out.push(CSHARP_PROVIDER_METHOD_MYSQL);
  out.push(CSHARP_PROVIDER_URL_HELPERS);
  return out.join("\n\n");
}

const CSHARP_SQLITE_PRECHECK_BLOCK = await loadChunk(
  "csharp",
  "sqlite_precheck",
);

export function csharpMigrateSqlitePrecheckContent(dialects: string[]): string {
  return dialects.includes("sqlite") ? CSHARP_SQLITE_PRECHECK_BLOCK : "";
}

const CSHARP_UP_DISPATCH_TOKENS_BY_DIALECT = {
  sqlite: { Dialect: "sqlite", CsName: "Sqlite" },
  postgres: { Dialect: "postgres", CsName: "Postgres" },
  mysql: { Dialect: "mysql", CsName: "Mysql" },
};

const CSHARP_UP_DISPATCH_CHUNKS = (await renderDialectMap(
  "csharp",
  "up_dispatch_arms",
  CSHARP_UP_DISPATCH_TOKENS_BY_DIALECT,
)) as Record<string, string>;

export function csharpMigrateUpDispatchArmsContent(dialects: string[]): string {
  return filterChunks(CSHARP_UP_DISPATCH_CHUNKS, dialects, "\n");
}

const CSHARP_DOWN_DISPATCH_TOKENS_BY_DIALECT = {
  sqlite: { Dialect: "sqlite", CsName: "Sqlite" },
  postgres: { Dialect: "postgres", CsName: "Postgres" },
  mysql: { Dialect: "mysql", CsName: "Mysql" },
};

const CSHARP_DOWN_DISPATCH_CHUNKS = (await renderDialectMap(
  "csharp",
  "down_dispatch_arms",
  CSHARP_DOWN_DISPATCH_TOKENS_BY_DIALECT,
)) as Record<string, string>;

export function csharpMigrateDownDispatchArmsContent(
  dialects: string[],
): string {
  return filterChunks(CSHARP_DOWN_DISPATCH_CHUNKS, dialects, "\n");
}

const CSHARP_UP_RUNNER_CHUNKS = {
  sqlite: await loadChunk("csharp", "up_runner_sqlite"),
  postgres: await loadChunk("csharp", "up_runner_postgres"),
  mysql: await loadChunk("csharp", "up_runner_mysql"),
};

export function csharpMigrateUpRunnerMethodsContent(
  dialects: string[],
): string {
  return filterChunks(CSHARP_UP_RUNNER_CHUNKS, dialects, "\n\n");
}

const CSHARP_DOWN_ROLLBACK_CHUNKS = {
  sqlite: await loadChunk("csharp", "down_rollback_sqlite"),
  postgres: await loadChunk("csharp", "down_rollback_postgres"),
  mysql: await loadChunk("csharp", "down_rollback_mysql"),
};

export function csharpMigrateDownRollbackMethodsContent(
  dialects: string[],
): string {
  return filterChunks(CSHARP_DOWN_ROLLBACK_CHUNKS, dialects, "\n\n");
}

async function loadCsharpModel(
  inputDir: string,
  applicationName: string | undefined,
  settings: ParsedSettings,
): Promise<AppModel> {
  return buildAppModel({
    ...(await loadBackendAppInputs(inputDir, settings)),
    applicationName,
  } as Parameters<typeof buildAppModel>[0]);
}

async function buildCsharpFiles(model: AppModel, multiLanguage: boolean) {
  return [
    {
      path: `${deriveCSharpProjectName(model)}.csproj`,
      content: await renderCSharpAppCsproj(model),
    },
    { path: "Program.cs", content: await renderCSharpProgram(model) },
    {
      path: "Dockerfile",
      content: await renderCSharpDockerfile(model, { multiLanguage }),
    },
    { path: "appsettings.json", content: await renderCSharpAppsettings() },
    {
      path: "appsettings.Development.json",
      content: await renderCSharpAppsettings("Development"),
    },
    {
      path: join("scripts", "entrypoint.sh"),
      content: await renderCSharpEntrypoint(),
      mode: 0o755,
    },
  ];
}

interface EmitArgs {
  input?: string;
}

export async function emitBackendApp(args: EmitArgs): Promise<EmitEntry[]> {
  if (!args.input) {
    throw new Error("create-backend-app (csharp): --input is required");
  }
  const inputDir = resolve(args.input);
  if (!(await pathExists(inputDir))) {
    throw new Error(
      `create-backend-app (csharp): input directory does not exist: ${inputDir}`,
    );
  }
  const settings = await readSettingsWithDefault(inputDir);
  const model = await loadCsharpModel(
    inputDir,
    settings.applicationName,
    settings,
  );
  const multiLanguage = isMultiLanguage(settings);
  // The app .csproj (DIALECT_PACKAGES) / Dockerfile / entrypoint.sh are composed skeletons that migrate/perf fill; everything else (Program.cs, appsettings, .dockerignore) is single-contributor content.
  const isSkeletonTarget = (path: string) =>
    path.endsWith(".csproj") ||
    path === "Dockerfile" ||
    path === join("scripts", "entrypoint.sh");
  const entries: EmitEntry[] = skeletonEntriesFromFiles(
    await buildCsharpFiles(model, multiLanguage),
    isSkeletonTarget,
  );
  entries.push(
    {
      kind: PATCH,
      filename: COMPOSE_FILENAME,
      content: multiLanguage
        ? renderCSharpComposeService(
            // compose-services.mjs infers dockerfilePath as null from its default; the runtime accepts the string path.
            { dockerfilePath: "./csharp/Dockerfile" } as unknown as Parameters<
              typeof renderCSharpComposeService
            >[0],
          )
        : renderCSharpSingleComposeService(model),
    },
    { kind: PATCH, filename: ".env", content: renderCSharpEnvSection() },
    {
      kind: PATCH,
      filename: ".env.example",
      content: renderCSharpEnvSection(),
    },
    {
      kind: PATCH,
      filename: ".gitignore",
      content: await renderCSharpGitignoreSection(),
    },
    {
      kind: PATCH,
      filename: ".dockerignore",
      section: dockerignoreSection("csharp"),
      content: DOCKERIGNORE_TRIGGER,
    },
  );
  return entries;
}

export const emit = makeBackendAppEmit(emitBackendApp, "csharp");
export const entriesNative = true;
export const pinProjectRoot = true;
export const flags = [COMBINED_FLAG];
