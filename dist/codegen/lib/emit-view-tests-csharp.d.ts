import type { ParsedSettings } from "@deterministic-code/generator-sdk/read-settings";
import { type NamesForOptions } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type { Datasource, View } from "@deterministic-code/generator-sdk/codegen/lib/emit-view-shared";
type Flatten<T> = {
    [K in keyof T]: T[K];
};
export type CsharpEmitOptions = Flatten<NamesForOptions & {
    schemaVersion: string;
    namespace: string;
    typesNamespace: string;
    datasourceNamespace: string;
    validatorsNamespace: string;
    datetime?: string;
}>;
interface EmittedFile {
    path: string;
    content: string;
}
export declare const DEFAULT_EMIT_OPTIONS: CsharpEmitOptions;
export declare function emitForView(view: View, datasource: Datasource | undefined, options?: Partial<CsharpEmitOptions>): EmittedFile;
export declare function emitFromSchema({ viewTypes, datasource }: {
    viewTypes: unknown;
    datasource?: Datasource;
}, options?: Partial<CsharpEmitOptions>): EmittedFile[];
export declare const createEmitter: () => {
    emit: (config: {
        settings: ParsedSettings;
        language: string;
    }) => any[];
};
export {};
