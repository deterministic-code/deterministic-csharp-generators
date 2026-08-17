import { type CommentStyle } from "@deterministic-code/generator-sdk/generate-doc-comment";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import type { GeneratedFile, RoutesGenerateConfig } from "@deterministic-code/generator-sdk/codegen/lib/routes-generate-types";
interface CsharpGenerateOptions {
    fileFormat?: CaseFormat;
    style?: CommentStyle;
    language?: string;
}
interface RouteCandidate {
    name: string;
}
interface EnrichmentDescriptor {
    targetTable: string;
}
type RouteEntry = Record<string, unknown>;
export declare const DEFAULT_GENERATE_OPTIONS: CsharpGenerateOptions;
export declare function generateReadOnlyRouter(candidate: RouteCandidate, options?: CsharpGenerateOptions): GeneratedFile;
export declare function generateCrudRouter(candidate: RouteCandidate, options?: CsharpGenerateOptions): GeneratedFile;
export declare function generateNameEnrichmentHelper({ targetTable }: EnrichmentDescriptor, options?: CsharpGenerateOptions): GeneratedFile;
export declare function generateCustomRouteStub(entry: RouteEntry, options?: CsharpGenerateOptions): GeneratedFile;
/** Catalog `routes` step (csharp). */
export declare const generate: (ctx: unknown) => Promise<unknown>;
export declare const createGenerator: () => {
    generate: (config: RoutesGenerateConfig) => GeneratedFile[];
};
export {};
