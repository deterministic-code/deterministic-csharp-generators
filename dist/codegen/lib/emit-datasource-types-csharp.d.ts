import type { EmittedFile } from "@deterministic-code/generator-sdk/codegen/lib/datasource-types-emit-types";
interface CsEmitOptions {
    baseClass: string;
    schemaVersion: string;
    namespace: string;
    baseNamespace: string;
    style: unknown;
    idType?: string;
    datetime?: string;
    withUuidColumn?: boolean;
}
export declare const DEFAULT_EMIT_OPTIONS: CsEmitOptions;
export declare const render: (config: import("@deterministic-code/generator-sdk/codegen/lib/datasource-types-emit-types").DatasourceTypesEmitConfig) => EmittedFile[], createEmitter: () => {
    emit: (config: import("@deterministic-code/generator-sdk/codegen/lib/datasource-types-emit-types").DatasourceTypesEmitConfig) => EmittedFile[];
}, emit: ({ inputs, settings }: import("@deterministic-code/generator-sdk/codegen/lib/emit-settings-options").DatasourceTypesEmitInput) => Promise<{
    files: EmittedFile[];
}>;
export {};
