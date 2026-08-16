import type { EmittedFile, ServiceTestsEmitConfig } from "@deterministic-code/generator-sdk/codegen/lib/service-tests-emit-types";
import { type CaseFormat } from "@deterministic-code/generator-sdk/case";
interface CsharpTestCandidate {
    name: string;
}
interface CsharpTestEmitOptions {
    schemaVersion?: string;
    servicePath?: string;
    fileFormat?: CaseFormat;
}
export declare const DEFAULT_EMIT_OPTIONS: {
    readonly schemaVersion: "1.0";
    readonly servicePath: ".";
    readonly fileFormat: "Camel";
};
export declare function emitGenericServiceTest(candidate: CsharpTestCandidate, options?: CsharpTestEmitOptions): EmittedFile;
/** Catalog `service_tests` step (csharp). */
export declare const emit: (ctx: unknown) => Promise<unknown>;
export declare const createEmitter: () => {
    emit: (config: ServiceTestsEmitConfig) => EmittedFile[];
};
export {};
