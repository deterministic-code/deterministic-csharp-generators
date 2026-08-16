export declare const DEFAULT_EMIT_OPTIONS: {
    baseClass: null;
    schemaVersion: string;
    namespace: string;
    datasourceNamespace: string;
    style: "none" | "simple" | "description";
};
/** Emitter owns its options: DEFAULT_EMIT_OPTIONS + datetime from settings; casing from CodegenNames; imports via CsharpImports. */
export declare const createEmitter: () => import("@deterministic-code/generator-sdk/codegen/lib/emit-view-shared").ViewEmitter<import("@deterministic-code/generator-sdk/read-settings").ParsedSettings>;
