import { needsListImport } from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
interface CsharpImportsCtx {
    opts: {
        datasourceNamespace: string;
    };
    names: Pick<CodegenNames, "className">;
}
/** The C# lane's import renderer, injected into an generator as `ctx.imports`. C# references other types by namespace-qualified name and brings namespaces into scope with `using` directives. */
export declare class CsharpImports {
    ctx: CsharpImportsCtx;
    constructor(ctx: CsharpImportsCtx);
    qualified(base: string): string;
    using(namespace: string): string;
    collections(view: Parameters<typeof needsListImport>[0]): string;
}
export {};
