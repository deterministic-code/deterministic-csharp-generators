import type { GeneratedFile } from "@deterministic-code/generator-sdk/codegen/lib/datasource-types-generate-types";
interface CsGenerateOptions {
    baseClass: string;
    schemaVersion: string;
    namespace: string;
    baseNamespace: string;
    style: unknown;
    idType?: string;
    datetime?: string;
    withUuidColumn?: boolean;
}
export declare const DEFAULT_GENERATE_OPTIONS: CsGenerateOptions;
export declare const render: (config: import("@deterministic-code/generator-sdk/codegen/lib/datasource-types-generate-types").DatasourceTypesGenerateConfig) => GeneratedFile[], createGenerator: () => {
    generate: (config: import("@deterministic-code/generator-sdk/codegen/lib/datasource-types-generate-types").DatasourceTypesGenerateConfig) => GeneratedFile[];
}, generate: ({ inputs, settings }: import("@deterministic-code/generator-sdk/codegen/lib/generate-settings-options").DatasourceTypesGenerateInput) => Promise<{
    files: GeneratedFile[];
}>;
export {};
