import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type { GeneratedFile, RoutesGenerateConfig } from "@deterministic-code/generator-sdk/codegen/lib/routes-generate-types";
interface CsharpTestOptions extends NamesForOptions {
    schemaVersion?: string;
    apiBase?: string;
    fileFormat?: CaseFormat;
}
interface TestCandidate {
    name: string;
}
export declare const DEFAULT_GENERATE_OPTIONS: CsharpTestOptions;
declare function generateRouterTest(candidate: TestCandidate, options?: CsharpTestOptions): GeneratedFile;
export declare const generateReadOnlyRouterTest: typeof generateRouterTest;
export declare const generateCrudRouterTest: typeof generateRouterTest;
/** Catalog `routes_tests` step (csharp). */
export declare const generate: (ctx: unknown) => Promise<unknown>;
export declare const createGenerator: () => {
    generate: (config: RoutesGenerateConfig) => GeneratedFile[];
};
export {};
