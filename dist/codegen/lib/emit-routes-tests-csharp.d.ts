import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type { EmittedFile, RoutesEmitConfig } from "@deterministic-code/generator-sdk/codegen/lib/routes-emit-types";
interface CsharpTestOptions extends NamesForOptions {
    schemaVersion?: string;
    apiBase?: string;
    fileFormat?: CaseFormat;
}
interface TestCandidate {
    name: string;
}
export declare const DEFAULT_EMIT_OPTIONS: CsharpTestOptions;
declare function emitRouterTest(candidate: TestCandidate, options?: CsharpTestOptions): EmittedFile;
export declare const emitReadOnlyRouterTest: typeof emitRouterTest;
export declare const emitCrudRouterTest: typeof emitRouterTest;
/** Catalog `routes_tests` step (csharp). */
export declare const emit: (ctx: unknown) => Promise<unknown>;
export declare const createEmitter: () => {
    emit: (config: RoutesEmitConfig) => EmittedFile[];
};
export {};
