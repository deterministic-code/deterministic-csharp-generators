import { type CommentStyle } from "@deterministic-code/generator-sdk/emit-doc-comment";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import type { EmittedFile, RoutesEmitConfig } from "@deterministic-code/generator-sdk/codegen/lib/routes-emit-types";
interface CsharpEmitOptions {
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
export declare const DEFAULT_EMIT_OPTIONS: CsharpEmitOptions;
export declare function emitReadOnlyRouter(candidate: RouteCandidate, options?: CsharpEmitOptions): EmittedFile;
export declare function emitCrudRouter(candidate: RouteCandidate, options?: CsharpEmitOptions): EmittedFile;
export declare function emitNameEnrichmentHelper({ targetTable }: EnrichmentDescriptor, options?: CsharpEmitOptions): EmittedFile;
export declare function emitCustomRouteStub(entry: RouteEntry, options?: CsharpEmitOptions): EmittedFile;
/** Catalog `routes` step (csharp). */
export declare const emit: (ctx: unknown) => Promise<unknown>;
export declare const createEmitter: () => {
    emit: (config: RoutesEmitConfig) => EmittedFile[];
};
export {};
