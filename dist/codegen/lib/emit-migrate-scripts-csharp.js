import { PACK_TEMPLATES_DIR } from "../../pack-root.js";
import { join } from "node:path";
import { buildAppModel, deriveCSharpProjectName, } from "@deterministic-code/generator-sdk/create-backend-app-model";
import { loadBackendAppInputs } from "@deterministic-code/generator-sdk/codegen/lib/backend-app-inputs";
import { csharpDialectPackagesContent, csharpDialectUsingsContent, csharpMigrateSetupDdlConstsContent, csharpMigrateSetupSwitchArmsContent, csharpMigrateSqlitePrecheckContent, csharpMigrateUpDispatchArmsContent, csharpMigrateUpRunnerMethodsContent, csharpMigrateDownDispatchArmsContent, csharpMigrateDownRollbackMethodsContent, csharpProviderConnectionStringMethodsContent, } from "./emit-backend-app-csharp.js";
import { csharpMigrateCopyContent, csharpMigrateRuntimeCopyContent, } from "@deterministic-code/generator-sdk/lib/migrate-scripts-plan";
import { layoutForSettings } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import { dbFilePatches, entrypointPatch, markedEntry, dockerfileCopyPatches, } from "@deterministic-code/generator-sdk/codegen/lib/migrate-sibling-patches";
import { content, gitkeepEntries, makeRunnerTemplates, makeMigrateEmit, MIGRATE_DIR_FLAG, } from "@deterministic-code/generator-sdk/codegen/lib/migrate-emit-helpers";
import { COMBINED_FLAG } from "@deterministic-code/generator-sdk/codegen/lib/backend-lane";
import { withSqliteDialect } from "@deterministic-code/generator-sdk/codegen/lib/deterministic-project";
const { read: runnerTemplate, composed } = makeRunnerTemplates(PACK_TEMPLATES_DIR)("csharp", "MigrateRunner");
/** MigrateSetup/Up/Down.cs with their per-dialect sections composed at emit time. */
async function migrateSourceEntries(migrateDir, dialects) {
    const usings = csharpDialectUsingsContent(dialects);
    const precheck = csharpMigrateSqlitePrecheckContent(dialects);
    return [
        content(join(migrateDir, "MigrateSetup.cs"), await composed("MigrateSetup.cs.tmpl", [
            ["DIALECT_USINGS", usings],
            ["DIALECT_DDL_CONSTS", csharpMigrateSetupDdlConstsContent(dialects)],
            ["DIALECT_SWITCH_ARMS", csharpMigrateSetupSwitchArmsContent(dialects)],
        ])),
        content(join(migrateDir, "MigrateUp.cs"), await composed("MigrateUp.cs.tmpl", [
            ["DIALECT_USINGS", usings],
            ["DIALECT_SQLITE_PRECHECK", precheck],
            ["DIALECT_DISPATCH_ARMS", csharpMigrateUpDispatchArmsContent(dialects)],
            [
                "DIALECT_RUNNER_METHODS",
                csharpMigrateUpRunnerMethodsContent(dialects),
            ],
        ])),
        content(join(migrateDir, "MigrateDown.cs"), await composed("MigrateDown.cs.tmpl", [
            ["DIALECT_USINGS", usings],
            ["DIALECT_SQLITE_PRECHECK", precheck],
            [
                "DIALECT_DISPATCH_ARMS",
                csharpMigrateDownDispatchArmsContent(dialects),
            ],
            [
                "DIALECT_ROLLBACK_METHODS",
                csharpMigrateDownRollbackMethodsContent(dialects),
            ],
        ])),
    ];
}
/** The C# migrate runner project files with their per-dialect DIALECT_* sections composed at emit time (fillMarkedSections). Program.cs + MigrateCreate.cs have no dialect sections. */
async function runnerFileEntries(migrateDir, dialects) {
    return [
        content(join(migrateDir, "MigrateRunner.csproj"), await composed("MigrateRunner.csproj", [
            ["DIALECT_PACKAGES", csharpDialectPackagesContent(dialects)],
        ])),
        content(join(migrateDir, "Program.cs"), await runnerTemplate("Program.cs")),
        ...(await migrateSourceEntries(migrateDir, dialects)),
        content(join(migrateDir, "MigrateCreate.cs"), await runnerTemplate("MigrateCreate.cs")),
        content(join(migrateDir, "ProviderConnectionString.cs"), await composed("ProviderConnectionString.cs.tmpl", [
            [
                "DIALECT_USINGS",
                csharpDialectUsingsContent(dialects, { includeSqlite: false }),
            ],
            [
                "DIALECT_METHODS",
                csharpProviderConnectionStringMethodsContent(dialects),
            ],
        ])),
    ];
}
/** The app *.csproj DIALECT_PACKAGES marked block (routed by the .csproj extension writer). The app project name is derived from the datasource model — the same derivation backend_app uses — so the patch needs no outDir; markedBlockWriter no-ops when the app csproj is absent (a standalone migrate scope). */
function appCsprojPatch(model, dialects) {
    return [
        markedEntry(`${deriveCSharpProjectName(model)}.csproj`, "DIALECT_PACKAGES", csharpDialectPackagesContent(dialects)),
    ];
}
/** All C# migrate output as CONTENT + PATCH entries. A combined scaffold patches the app csproj / Dockerfile / .env / entrypoint; a standalone scope emits its runner project and the sibling patches no-op on the absent files. */
async function csharpEntries({ migrateDir, dialects = [], inputs, settings, combined, }) {
    const model = buildAppModel((await loadBackendAppInputs(inputs.dir, settings)));
    const layout = layoutForSettings(settings, "csharp");
    const { lane, shared } = layout.migrateDockerCopyPrefixes({ combined });
    // The MigrateRunner project must carry the sqlite dispatch arm + Microsoft.Data.Sqlite package so verify can boot it with `--provider sqlite`; the deployment builders below (gitkeep, app csproj, .env) stay on the configured production dialects.
    const runnerDialects = withSqliteDialect(dialects);
    return [
        ...(await runnerFileEntries(migrateDir, runnerDialects)),
        ...gitkeepEntries(dialects, settings),
        ...appCsprojPatch(model, dialects),
        ...dockerfileCopyPatches(csharpMigrateCopyContent(migrateDir, lane, shared), csharpMigrateRuntimeCopyContent(migrateDir, lane, shared)),
        entrypointPatch("csharp", migrateDir, layout),
        ...dbFilePatches(dialects),
    ];
}
export const migrateCsharp = {
    language: "csharp",
    emit: csharpEntries,
};
export const emit = makeMigrateEmit(csharpEntries);
export const flags = [MIGRATE_DIR_FLAG, COMBINED_FLAG];
export const entriesNative = true;
export const pinProjectRoot = true;
