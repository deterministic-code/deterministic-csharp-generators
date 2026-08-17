import type { ParsedSettings } from "@deterministic-code/generator-sdk/read-settings";
import { type CommentStyle } from "@deterministic-code/generator-sdk/generate-doc-comment";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
interface ServiceCandidate {
    name: string;
    datasourceType?: string;
}
interface CustomServiceEntry {
    name: string;
}
interface CsharpGenerateOptions {
    fileFormat?: CaseFormat;
    style?: CommentStyle;
}
interface GeneratedFile {
    path: string;
    content: string;
}
interface ServicesGenerateConfig {
    services: unknown;
    viewTypes: unknown;
    datasourceTypes: unknown;
    routes: unknown;
    settings: ParsedSettings;
    language: unknown;
}
export declare const DEFAULT_GENERATE_OPTIONS: {
    fileFormat: string;
    style: "none" | "simple" | "description";
};
export declare function generateGenericService(candidate: ServiceCandidate, options?: CsharpGenerateOptions): GeneratedFile;
export declare function generateCustomServiceStub(entry: CustomServiceEntry, options?: CsharpGenerateOptions): GeneratedFile;
/** Catalog `services` step (csharp). */
export declare const generate: (ctx: unknown) => Promise<unknown>;
/** Generator owns its render primitives + options; the shared orchestration in services-generate.ts does the rest. */
export declare const createGenerator: () => {
    generate: (config: ServicesGenerateConfig) => import("@deterministic-code/generator-sdk/codegen/lib/service-tests-generate-types").GeneratedFile[];
};
export {};
