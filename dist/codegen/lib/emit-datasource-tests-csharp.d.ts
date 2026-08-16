import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
type Flatten<T> = {
    [K in keyof T]: T[K];
};
export type CsharpEmitOptions = Flatten<NamesForOptions & {
    schemaVersion: string;
    namespace: string;
    typesNamespace: string;
    validatorsNamespace: string;
    datetime?: string;
}>;
export declare const DEFAULT_EMIT_OPTIONS: CsharpEmitOptions;
export declare function emitForTable(entry: Record<string, unknown>, datasource: unknown, options?: Partial<CsharpEmitOptions>): {
    path: string;
    content: string;
};
export declare const emitFromSchema: (data: any, options: any) => any, createEmitter: () => {
    emit: (config: {
        settings: import("@deterministic-code/generator-sdk/read-settings").ParsedSettings;
        language: string;
    }) => any[];
};
export {};
