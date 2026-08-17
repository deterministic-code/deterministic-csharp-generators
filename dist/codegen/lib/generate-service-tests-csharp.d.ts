import type { GeneratedFile, ServiceTestsGenerateConfig } from "@deterministic-code/generator-sdk/codegen/lib/service-tests-generate-types";
import { type CaseFormat } from "@deterministic-code/generator-sdk/case";
interface CsharpTestCandidate {
    name: string;
}
interface CsharpTestGenerateOptions {
    schemaVersion?: string;
    servicePath?: string;
    fileFormat?: CaseFormat;
}
export declare const DEFAULT_GENERATE_OPTIONS: {
    readonly schemaVersion: "1.0";
    readonly servicePath: ".";
    readonly fileFormat: "Camel";
};
export declare function generateGenericServiceTest(candidate: CsharpTestCandidate, options?: CsharpTestGenerateOptions): GeneratedFile;
/** Catalog `service_tests` step (csharp). */
export declare const generate: (ctx: unknown) => Promise<unknown>;
export declare const createGenerator: () => {
    generate: (config: ServiceTestsGenerateConfig) => GeneratedFile[];
};
export {};
