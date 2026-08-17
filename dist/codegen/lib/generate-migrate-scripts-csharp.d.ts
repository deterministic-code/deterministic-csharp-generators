import type { MigrateEntry, MigrateRenderOptions } from "@deterministic-code/generator-sdk/codegen/lib/migrate-scripts-generate-types";
/** All C# migrate output as CONTENT + PATCH entries. A combined scaffold patches the app csproj / Dockerfile / .env / entrypoint; a standalone scope generates its runner project and the sibling patches no-op on the absent files. */
declare function csharpEntries({ migrateDir, dialects, inputs, settings, combined, }: MigrateRenderOptions): Promise<MigrateEntry[]>;
export declare const migrateCsharp: {
    language: string;
    generate: typeof csharpEntries;
};
export declare const generate: ({ inputs, settings, args }: import("@deterministic-code/generator-sdk/codegen/lib/migrate-generate-helpers").MigrateGenerateArgs) => Promise<{
    entries: import("@deterministic-code/generator-sdk/codegen/lib/generate-result").GenerateEntry[];
}>;
export declare const flags: ({
    flag: string;
    target: string;
    kind: string;
    defaultValue: boolean;
    description: string;
} | {
    flag: string;
    target: string;
    kind: string;
    defaultValue: string;
    placeholder: string;
    description: string;
})[];
export declare const entriesNative = true;
export declare const pinProjectRoot = true;
export {};
