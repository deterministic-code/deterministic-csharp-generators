import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
type Flatten<T> = {
    [K in keyof T]: T[K];
};
export type CsharpGenerateOptions = Flatten<NamesForOptions & {
    schemaVersion: string;
    namespace: string;
    typesNamespace: string;
    validatorsNamespace: string;
    datetime?: string;
}>;
export declare const DEFAULT_GENERATE_OPTIONS: CsharpGenerateOptions;
export declare function generateForTable(entry: Record<string, unknown>, datasource: unknown, options?: Partial<CsharpGenerateOptions>): {
    path: string;
    content: string;
};
export declare const generateFromSchema: (data: any, options: any) => any, createGenerator: () => {
    generate: (config: {
        settings: import("@deterministic-code/generator-sdk/read-settings").ParsedSettings;
        language: string;
    }) => any[];
};
export {};
