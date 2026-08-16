/** Self-describing emit for the csharp datasource-type tests — wraps the shared `emit-datasource-tests-csharp` render via `makeDatasourceEmit`. */
export declare const emit: ({ inputs, settings }: import("@deterministic-code/generator-sdk/codegen/lib/datasource-emit-config").DatasourceEmitContext) => Promise<{
    files: unknown;
}>;
