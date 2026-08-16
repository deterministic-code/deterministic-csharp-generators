import { buildAppModel } from "@deterministic-code/generator-sdk/create-backend-app-model";
import { type EmitEntry } from "@deterministic-code/generator-sdk/codegen/lib/emit-result";
type AppModel = ReturnType<typeof buildAppModel>;
export declare function csharpDialectPackagesContent(dialects: string[]): string;
export declare function renderCSharpAppCsproj(model: AppModel): Promise<string>;
export declare function renderCSharpProgram(model: AppModel): Promise<string>;
export declare function renderCSharpDockerfile(model: AppModel, { multiLanguage }?: {
    multiLanguage?: boolean;
}): Promise<string>;
export declare function renderCSharpAppsettings(env?: string): Promise<string>;
export declare function renderCSharpGitignoreSection(): Promise<string>;
export declare function renderCSharpEnvSection(): string;
export declare function renderCSharpEntrypoint(): Promise<string>;
export declare function csharpDialectUsingsContent(dialects: string[], opts?: {
    includeSqlite?: boolean;
}): string;
export declare function csharpMigrateSetupDdlConstsContent(dialects: string[]): string;
export declare function csharpMigrateSetupSwitchArmsContent(dialects: string[]): string;
export declare function csharpProviderConnectionStringMethodsContent(dialects: string[]): string;
export declare function csharpMigrateSqlitePrecheckContent(dialects: string[]): string;
export declare function csharpMigrateUpDispatchArmsContent(dialects: string[]): string;
export declare function csharpMigrateDownDispatchArmsContent(dialects: string[]): string;
export declare function csharpMigrateUpRunnerMethodsContent(dialects: string[]): string;
export declare function csharpMigrateDownRollbackMethodsContent(dialects: string[]): string;
interface EmitArgs {
    input?: string;
}
export declare function emitBackendApp(args: EmitArgs): Promise<EmitEntry[]>;
export declare const emit: ({ inputs, args }: import("@deterministic-code/generator-sdk/codegen/lib/backend-app-emit-helpers").BackendAppEmitContext) => Promise<{
    entries: unknown;
}>;
export declare const entriesNative = true;
export declare const pinProjectRoot = true;
export declare const flags: {
    flag: string;
    target: string;
    kind: string;
    defaultValue: boolean;
    description: string;
}[];
export {};
