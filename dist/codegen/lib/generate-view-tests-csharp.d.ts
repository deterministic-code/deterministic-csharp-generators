import type { ParsedSettings } from "@deterministic-code/generator-sdk/read-settings";
import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type { Datasource, View } from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
type Flatten<T> = {
    [K in keyof T]: T[K];
};
export type CsharpGenerateOptions = Flatten<NamesForOptions & {
    schemaVersion: string;
    namespace: string;
    typesNamespace: string;
    datasourceNamespace: string;
    validatorsNamespace: string;
    datetime?: string;
}>;
interface GeneratedFile {
    path: string;
    content: string;
}
export declare const DEFAULT_GENERATE_OPTIONS: CsharpGenerateOptions;
export declare function generateForView(view: View, datasource: Datasource | undefined, options?: Partial<CsharpGenerateOptions>): GeneratedFile;
export declare function generateFromSchema({ viewTypes, datasource }: {
    viewTypes: unknown;
    datasource?: Datasource;
}, options?: Partial<CsharpGenerateOptions>): GeneratedFile[];
export declare const createGenerator: () => {
    generate: (config: {
        settings: ParsedSettings;
        language: string;
    }) => any[];
};
export {};
