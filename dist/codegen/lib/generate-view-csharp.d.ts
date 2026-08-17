export declare const DEFAULT_GENERATE_OPTIONS: {
    baseClass: null;
    schemaVersion: string;
    namespace: string;
    datasourceNamespace: string;
    style: "none" | "simple" | "description";
};
/** Generator owns its options: DEFAULT_GENERATE_OPTIONS + datetime from settings; casing from CodegenNames; imports via CsharpImports. */
export declare const createGenerator: () => import("@deterministic-code/generator-sdk/codegen/lib/generate-view-shared").ViewGenerator<import("@deterministic-code/generator-sdk/read-settings").ParsedSettings>;
