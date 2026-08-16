import type { ParsedSettings } from "@deterministic-code/generator-sdk/read-settings";
import { type CommentStyle } from "@deterministic-code/generator-sdk/emit-doc-comment";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
interface ServiceCandidate {
    name: string;
    datasourceType?: string;
}
interface CustomServiceEntry {
    name: string;
}
interface CsharpEmitOptions {
    fileFormat?: CaseFormat;
    style?: CommentStyle;
}
interface EmittedFile {
    path: string;
    content: string;
}
interface ServicesEmitConfig {
    services: unknown;
    viewTypes: unknown;
    datasourceTypes: unknown;
    routes: unknown;
    settings: ParsedSettings;
    language: unknown;
}
export declare const DEFAULT_EMIT_OPTIONS: {
    fileFormat: string;
    style: "none" | "simple" | "description";
};
export declare function emitGenericService(candidate: ServiceCandidate, options?: CsharpEmitOptions): EmittedFile;
export declare function emitCustomServiceStub(entry: CustomServiceEntry, options?: CsharpEmitOptions): EmittedFile;
/** Catalog `services` step (csharp). */
export declare const emit: (ctx: unknown) => Promise<unknown>;
/** Emitter owns its render primitives + options; the shared orchestration in services-emit.ts does the rest. */
export declare const createEmitter: () => {
    emit: (config: ServicesEmitConfig) => import("@deterministic-code/generator-sdk/codegen/lib/service-tests-emit-types").EmittedFile[];
};
export {};
